import {
  install,
  Browser,
  resolveBuildId,
  detectBrowserPlatform,
  computeExecutablePath,
} from '@puppeteer/browsers'
import { existsSync, readdirSync } from 'fs'
import { rm } from 'fs/promises'
import { join } from 'path'
import { Browser as PuppeteerBrowser, launch } from 'puppeteer-core'
import {
  defaultChromeArguments,
  defaultFirefoxArguments,
  defaultFirefoxPreferences,
} from '../core/const'
import { createLogger } from '../core/logger'

const logger = createLogger('browser-manager')
const platform = detectBrowserPlatform()
const LAUNCH_TIMEOUT_MS = 30_000

export interface BrowserVersion {
  browser?: 'chrome' | 'firefox'
  version?: string
}

export interface BrowserLaunchOptions {
  version: BrowserVersion
  arguments?: Array<string>
  restrictedDomains?: Record<string, Array<string>>
  puppeteerLaunchOptionsExtra?: Record<string, unknown>
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

const buildPac = (restrictedDomains: Record<string, Array<string>>): string => {
  let result = 'function FindProxyForURL(url, host) {'
  // 1. Explicitly allow allowed domains:
  result +=
    '\n' +
    Object.values(restrictedDomains)
      .flat()
      .map(
        subdomain =>
          `  if (host.toLowerCase() == "${subdomain.toLowerCase()}") return "DIRECT";`
      )
      .join('\n')
  // 2. Disallow other domains
  // TODO(es3n1n): shExpMatch? but this will change the format of banned domains pattern from just `example.com` to `*.example.com`
  result +=
    '\n' +
    Object.keys(restrictedDomains)
      .map(
        domain =>
          `  if (host.toLowerCase().endsWith("${domain.toLowerCase()}")) return "PROXY 127.0.0.1:1";`
      )
      .join('\n')
  // 3. Allow everything else:
  result += '\n  return "DIRECT";'
  result += '\n}'
  return result
}

export class BrowserManager {
  private cacheDir: string
  private installedVersions = new Map<string, string>()
  private resolvedBuildIds = new Map<string, string>()
  private downloadPromises = new Map<string, Promise<string>>()

  // TODO(es3n1n): a better path for browser cache for production?
  // TODO(es3n1n): make sure if you get RCE within this container, that you can't modify any binaries, etc
  constructor(cacheDir: string = '.browser-cache') {
    this.cacheDir = cacheDir
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
      browserVersion.browser === 'chrome' ? Browser.CHROME : Browser.FIREFOX

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

  async launchBrowser(
    options: BrowserLaunchOptions
  ): Promise<PuppeteerBrowser> {
    const version = getVersion(options.version)
    const executablePath = await this.getBrowserPath(version)

    const args = [
      ...(options.arguments ??
        {
          chrome: defaultChromeArguments,
          firefox: defaultFirefoxArguments,
        }[version.browser]!),
    ]

    let extraPrefsFirefox: Record<string, any> | undefined
    if (version.browser === 'firefox') {
      extraPrefsFirefox = { ...defaultFirefoxPreferences }
    }

    if (options.restrictedDomains) {
      const pac = buildPac(options.restrictedDomains)
      const pacDataUrl = `data:application/x-ns-proxy-autoconfig;base64,${Buffer.from(pac).toString('base64')}`

      if (version.browser === 'chrome') {
        args.push(`--proxy-pac-url=${pacDataUrl}`)
      } else {
        extraPrefsFirefox = {
          ...extraPrefsFirefox,
          'network.proxy.type': 2, // PAC
          'network.proxy.autoconfig_url': pacDataUrl,
        }
      }
    }

    return Promise.race([
      launch({
        headless: true,
        browser: version.browser,
        args,
        executablePath,
        extraPrefsFirefox,
        ...(options.puppeteerLaunchOptionsExtra ?? {}),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('browser launch timed out')),
          LAUNCH_TIMEOUT_MS
        )
      ),
    ])
  }
}
