import { existsSync, readdirSync } from 'fs'
import { rm } from 'fs/promises'
import { join } from 'path'
import {
  Browser as InstalledBrowser,
  computeExecutablePath,
  detectBrowserPlatform,
  install,
  resolveBuildId,
} from '@puppeteer/browsers'
import { withTimeout } from '@rctf/util'
import { launch, Browser as PuppeteerBrowser } from 'puppeteer-core'
import {
  defaultChromeArguments,
  defaultFirefoxArguments,
  defaultFirefoxPreferences,
} from '../core/const'
import { createLogger } from '../core/logger'
import type { RestrictedDomainsConfig } from '../core/egress-policy'
import { EgressProxy } from './egress-proxy'

const logger = createLogger('browser-manager')
const platform = detectBrowserPlatform()
const LAUNCH_TIMEOUT_MS = 30_000

export interface BrowserVersion {
  browser?: 'chrome' | 'firefox'
  version?: string
}

export interface BrowserLaunchOptions {
  version: BrowserVersion
  timeoutMilliseconds: number
  arguments?: Array<string>
  restrictedDomains?: RestrictedDomainsConfig
  puppeteerLaunchOptionsExtra?: Record<string, unknown>
  extraPrefsFirefox?: Record<string, unknown>
}

export interface ManagedBrowser {
  readonly browser: PuppeteerBrowser
  close(): Promise<void>
}

const RESERVED_BROWSER_SWITCHES = new Set([
  '--proxy-server',
  '--no-proxy-server',
  '--proxy-pac-url',
  '--proxy-auto-detect',
  '--proxy-bypass-list',
  '--force-webrtc-ip-handling-policy',
  '--webrtc-ip-handling-policy',
  '--enable-quic',
])

export const sanitizeBrowserArguments = (args: string[]): string[] => {
  const sanitized: string[] = []
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!
    const switchName = argument.startsWith('--')
      ? argument.slice(
          0,
          argument.indexOf('=') === -1 ? undefined : argument.indexOf('=')
        )
      : ''
    if (!RESERVED_BROWSER_SWITCHES.has(switchName)) {
      sanitized.push(argument)
      continue
    }

    if (!argument.includes('=') && !args[index + 1]?.startsWith('--')) {
      index++
    }
  }
  return sanitized
}

export const buildLaunchConfiguration = (
  options: BrowserLaunchOptions,
  executablePath: string,
  proxyPort: number
): Parameters<typeof launch>[0] => {
  const version = getVersion(options.version)
  const challengeArgs =
    options.arguments ??
    {
      chrome: defaultChromeArguments,
      firefox: defaultFirefoxArguments,
    }[version.browser]!
  const args = sanitizeBrowserArguments([...challengeArgs])

  let extraPrefsFirefox: Record<string, unknown> | undefined
  if (version.browser === 'chrome') {
    args.push(
      `--proxy-server=http://127.0.0.1:${proxyPort}`,
      '--proxy-bypass-list=<-loopback>',
      '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
      '--webrtc-ip-handling-policy=disable_non_proxied_udp',
      '--disable-quic'
    )
  } else {
    extraPrefsFirefox = {
      ...defaultFirefoxPreferences,
      ...options.extraPrefsFirefox,
      'network.proxy.type': 1,
      'network.proxy.http': '127.0.0.1',
      'network.proxy.http_port': proxyPort,
      'network.proxy.ssl': '127.0.0.1',
      'network.proxy.ssl_port': proxyPort,
      'network.proxy.share_proxy_settings': true,
      'network.proxy.no_proxies_on': '',
      'network.proxy.allow_hijacking_localhost': true,
      'network.proxy.failover_direct': false,
      'network.proxy.allow_bypass': false,
      'media.peerconnection.enabled': false,
      'media.peerconnection.ice.no_host': true,
      'media.peerconnection.ice.proxy_only_if_behind_proxy': true,
      'network.http.http3.enable': false,
      'network.webtransport.enabled': false,
      'network.webtransport.datagrams.enabled': false,
    }
  }

  return {
    ...options.puppeteerLaunchOptionsExtra,
    headless: true,
    browser: version.browser,
    args,
    executablePath,
    extraPrefsFirefox,
    userDataDir: options.puppeteerLaunchOptionsExtra?.userDataDir as
      | string
      | undefined,
  }
}

const getVersion = (config: BrowserVersion): Required<BrowserVersion> => {
  return {
    browser: config.browser ?? 'chrome',
    version: config.version ?? 'stable',
  }
}

const getKey = (config: Required<BrowserVersion>): string => {
  return `${config.browser}-${config.version}`
}

export class BrowserManager {
  private cacheDir: string
  private installedVersions = new Map<string, string>()
  private resolvedBuildIds = new Map<string, string>()
  private downloadPromises = new Map<string, Promise<string>>()

  constructor(
    cacheDir?: string,
    readonly egressProxy: EgressProxy = new EgressProxy()
  ) {
    this.cacheDir = cacheDir ?? '.browser-cache'
  }

  async getBrowserPath(config: BrowserVersion): Promise<string> {
    const browserVersion = getVersion(config)
    const key = getKey(browserVersion)
    if (this.installedVersions.has(key)) {
      return this.installedVersions.get(key)!
    }

    if (this.downloadPromises.has(key)) {
      logger.debug({ key }, 'waiting for in-progress download')
      return this.downloadPromises.get(key)!
    }

    const downloadPromise = this.downloadBrowser(browserVersion, key)
    this.downloadPromises.set(key, downloadPromise)

    try {
      const path = await downloadPromise
      return path
    } finally {
      this.downloadPromises.delete(key)
    }
  }

  private async downloadBrowser(
    browserVersion: Required<BrowserVersion>,
    key: string
  ): Promise<string> {
    if (!platform) {
      throw new Error('Could not detect browser platform')
    }

    const browserType =
      browserVersion.browser === 'chrome'
        ? InstalledBrowser.CHROME
        : InstalledBrowser.FIREFOX

    const log = logger.child({ browserVersion })

    let buildId = this.resolvedBuildIds.get(key)
    if (!buildId) {
      log.info('resolving browser version')
      buildId = await resolveBuildId(
        browserType,
        platform,
        browserVersion.version
      )
      this.resolvedBuildIds.set(key, buildId)
      log.info({ buildId }, 'resolved browser version')
    }

    const expectedPath = computeExecutablePath({
      browser: browserType,
      buildId,
      cacheDir: this.cacheDir,
    })
    if (existsSync(expectedPath)) {
      log.info({ expectedPath }, 'using cached browser')
      this.installedVersions.set(key, expectedPath)
      return expectedPath
    }

    const installDir = expectedPath.substring(
      0,
      expectedPath.indexOf(buildId) + buildId.length
    )
    const browserCacheDir = join(this.cacheDir, browserType)

    const cleanupInstallDir = async () => {
      if (existsSync(installDir)) {
        log.warn({ installDir }, 'removing incomplete/corrupted extraction')
        await rm(installDir, { recursive: true, force: true })
      }

      if (existsSync(browserCacheDir)) {
        const files = readdirSync(browserCacheDir)
        for (const file of files) {
          if (file.includes(buildId) && file.endsWith('.zip')) {
            const zipPath = join(browserCacheDir, file)
            log.warn({ zipPath }, 'removing corrupted zip')
            await rm(zipPath, { force: true })
          }
        }
      }
    }

    log.info('downloading browser, this can take a while')

    let lastLoggedPercent = -5
    const progressCallback = (downloadedBytes: number, totalBytes: number) => {
      const percent = (downloadedBytes / totalBytes) * 100
      const downloadedMB = downloadedBytes / 1024 / 1024
      const totalMB = totalBytes / 1024 / 1024

      // Log every 5%
      if (percent - lastLoggedPercent >= 5) {
        lastLoggedPercent = Math.floor(percent / 5) * 5
        log.info(
          { downloadedMB, totalMB, percent },
          `downloading: ${downloadedMB.toFixed(1)}MB / ${totalMB.toFixed(1)}MB (${percent.toFixed(1)}%)`
        )
      }
    }

    let result
    try {
      result = await install({
        browser: browserType,
        buildId,
        cacheDir: this.cacheDir,
        downloadProgressCallback: progressCallback,
      })
    } catch (err) {
      log.warn({ err }, 'download failed, cleaning up and retrying')
      await cleanupInstallDir()

      log.info('trying to download browser again, this can take a while')
      result = await install({
        browser: browserType,
        buildId,
        cacheDir: this.cacheDir,
        downloadProgressCallback: progressCallback,
      })
    }

    log.info({ path: result.executablePath }, 'browser ready')

    this.installedVersions.set(key, result.executablePath)
    return result.executablePath
  }

  async launchBrowser(options: BrowserLaunchOptions): Promise<ManagedBrowser> {
    const version = getVersion(options.version)
    const executablePath = await this.getBrowserPath(version)
    const session = await this.egressProxy.openSession({
      restrictedDomains: options.restrictedDomains,
      idleTimeoutMs: options.timeoutMilliseconds + 5_000,
    })

    let browser: PuppeteerBrowser
    try {
      browser = await withTimeout(
        launch(buildLaunchConfiguration(options, executablePath, session.port)),
        LAUNCH_TIMEOUT_MS,
        () => {
          throw new Error('browser launch timed out')
        }
      )
    } catch (error) {
      await session.close()
      throw error
    }

    browser.on('disconnected', () => {
      void session.close().catch(error => {
        logger.warn(
          { error, sessionId: session.id },
          'failed to close egress session'
        )
      })
    })

    let closePromise: Promise<void> | undefined
    return {
      browser,
      close: () =>
        (closePromise ??= Promise.allSettled([
          session.close(),
          Promise.resolve().then(() => browser.close()),
        ]).then(results => {
          const errors = results.flatMap(result =>
            result.status === 'rejected' ? [result.reason] : []
          )
          if (errors.length) {
            throw new AggregateError(errors, 'Failed to close browser session')
          }
        })),
    }
  }
}
