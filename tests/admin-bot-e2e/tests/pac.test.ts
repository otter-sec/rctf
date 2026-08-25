import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createSocket, type Socket as UdpSocket } from 'node:dgram'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { BrowserManager } from '../../../apps/admin-bot/src/browser/manager'
import { EgressProxy } from '../../../apps/admin-bot/src/browser/egress-proxy'
import {
  defaultChromeArguments,
  defaultFirefoxArguments,
  defaultFirefoxPreferences,
} from '../../../apps/admin-bot/src/core/const'
import {
  browserManager,
  BROWSER_CACHE_DIR,
  browsers,
  challengeSource,
  runChallenge,
  type BrowserType,
  type ParsedLog,
} from './helper'

const TEST_TIMEOUT = 30_000
const TEST_HOST = 'localhost'

interface BrowserEgressConfig {
  browserArgs: string[]
  extraPrefsFirefox?: Record<string, unknown>
}

const egressBrowserConfigs: Record<BrowserType, BrowserEgressConfig> = {
  chrome: {
    browserArgs: [
      ...defaultChromeArguments,
      `--host-resolver-rules=MAP ${TEST_HOST} 127.0.0.1`,
    ],
  },
  firefox: {
    browserArgs: [...defaultFirefoxArguments],
    extraPrefsFirefox: {
      ...defaultFirefoxPreferences,
      'network.dns.localDomains': TEST_HOST,
    },
  },
}

let server: ReturnType<typeof Bun.serve>
let serverPort: number
let tlsServer: ReturnType<typeof Bun.serve>
let tlsServerPort: number
let tlsWebsocketConnections = 0
let stunListener: UdpSocket
let stunPort: number
let stunPackets = 0

beforeAll(async () => {
  server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    fetch(req) {
      const pathname = new URL(req.url).pathname
      if (pathname === '/redirect-private') {
        return Response.redirect('http://10.0.0.1/private', 302)
      }
      return new Response(`ok:${pathname}`, { status: 200 })
    },
  })
  serverPort = server.port!

  const certificateDirectory = resolve(
    import.meta.dir,
    '..',
    '..',
    '..',
    'deploy',
    'docker-instancer',
    'certs'
  )
  tlsServer = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    tls: {
      key: await Bun.file(resolve(certificateDirectory, 'privkey.pem')).text(),
      cert: await Bun.file(
        resolve(certificateDirectory, 'fullchain.pem')
      ).text(),
    },
    fetch(request, server) {
      if (new URL(request.url).pathname === '/ws' && server.upgrade(request)) {
        return
      }
      return new Response('secure-ok')
    },
    websocket: {
      open() {
        tlsWebsocketConnections++
      },
      message(socket, message) {
        socket.send(`echo:${message}`)
      },
    },
  })
  tlsServerPort = tlsServer.port!

  stunListener = createSocket('udp4')
  stunListener.on('message', () => stunPackets++)
  await new Promise<void>((resolve, reject) => {
    stunListener.once('error', reject)
    stunListener.bind(0, '127.0.0.1', () => {
      stunListener.off('error', reject)
      resolve()
    })
  })
  stunPort = stunListener.address().port
}, 5_000)

afterAll(() => {
  server.stop(true)
  tlsServer.stop(true)
  stunListener.close()
})

const r = (pattern: string, flags?: string) => ({ pattern, flags })

const extractFetchResults = (
  parsed: ParsedLog[]
): Record<string, { status: string; body: string }> => {
  const results: Record<string, { status: string; body: string }> = {}
  for (const log of parsed) {
    if (
      log.prefix === 'challenge' &&
      typeof log.line === 'string' &&
      log.line.startsWith('fetch:')
    ) {
      const parts = log.line.split(':')
      const path = parts[1]!
      const status = parts[2]!
      const body = parts.slice(3).join(':')
      results[path] = { status, body }
    }
  }
  return results
}

const testUrl = (path: string): string =>
  `http://${TEST_HOST}:${serverPort}${path}`

const hasChallengeLog = (parsed: ParsedLog[], line: string) =>
  parsed.some(log => log.prefix === 'challenge' && log.line === line)

const makeFetchHandler = (
  paths: string[],
  startUrl = testUrl('/'),
  host = TEST_HOST
): string => {
  const urls = paths.map(path => `http://${host}:${serverPort}${path}`)
  return `
    const page = await ctx.browserContext.newPage()
    await page.goto('${startUrl}')
    for (const url of ${JSON.stringify(urls)}) {
      const result = await page.evaluate(async fetchUrl => {
        try {
          const res = await fetch(fetchUrl)
          return 'fetch:' + new URL(fetchUrl).pathname + ':' + res.status + ':' + await res.text()
        } catch (e) {
          return 'fetch:' + new URL(fetchUrl).pathname + ':error:' + e.message
        }
      }, url)
      ctx.output.info('challenge', result)
    }
    await page.close()`
}

const websocketHandler = () => `
    const page = await ctx.browserContext.newPage()
    await page.goto('about:blank')
    const result = await page.evaluate(() => new Promise(resolve => {
      const socket = new WebSocket('wss://localhost:${tlsServerPort}/ws')
      const done = value => { clearTimeout(timeout); socket.close(); resolve(value) }
      const timeout = setTimeout(() => done('blocked'), 3000)
      socket.onopen = () => socket.send('hello')
      socket.onmessage = event => done(event.data)
      socket.onerror = () => done('blocked')
    }))
    ctx.output.info('challenge', 'websocket:' + result)
    await page.close()`

describe('egress proxy e2e [firefox] - localhost bypass regression', () => {
  const { browserArgs, extraPrefsFirefox } = egressBrowserConfigs['firefox']

  beforeAll(async () => {
    await browserManager.getBrowserPath({
      browser: 'firefox',
      version: 'stable',
    })
  }, 120_000)

  test.each([
    ['localhost', '^localhost$'],
    ['127.0.0.1', '^127\\.0\\.0\\.1$'],
  ])(
    'disallowRegex blocks %s in Firefox',
    async (host, pattern) => {
      const result = await runChallenge({
        source: challengeSource({
          handler: makeFetchHandler(['/loopback-test'], 'about:blank', host),
          browser: 'firefox',
          browserArguments: browserArgs,
          extraPrefsFirefox,
          restrictDomains: {
            host: { disallowRegex: [r(pattern)] },
          },
        }),
      })
      expect(extractFetchResults(result.parsed)['/loopback-test']?.status).toBe(
        'error'
      )
    },
    TEST_TIMEOUT
  )
})

for (const browser of browsers) {
  const { browserArgs, extraPrefsFirefox } = egressBrowserConfigs[browser]

  const runEgress = (
    handler: string,
    options: Omit<
      Partial<Parameters<typeof challengeSource>[0]>,
      'handler' | 'browser'
    > = {}
  ) =>
    runChallenge({
      source: challengeSource({
        browser,
        browserArguments: browserArgs,
        extraPrefsFirefox,
        ...options,
        handler,
      }),
    })

  describe(`egress proxy e2e [${browser}]`, () => {
    beforeAll(async () => {
      await browserManager.getBrowserPath({ browser, version: 'stable' })
    }, 120_000)

    test(
      'no restrictions - all fetches succeed',
      async () => {
        const result = await runEgress(makeFetchHandler(['/hello', '/world']))

        expect(result.success).toBe(true)
        const fetches = extractFetchResults(result.parsed)
        expect(fetches['/hello']?.status).toBe('200')
        expect(fetches['/hello']?.body).toBe('ok:/hello')
        expect(fetches['/world']?.status).toBe('200')
      },
      TEST_TIMEOUT
    )

    test(
      'challenge proxy switches cannot replace enforced egress settings',
      async () => {
        const result = await runEgress(makeFetchHandler(['/enforced-proxy']), {
          browserArguments: [
            ...browserArgs,
            '--proxy-server=http://127.0.0.1:1',
            '--proxy-bypass-list=*',
            '--webrtc-ip-handling-policy=default',
            '--force-webrtc-ip-handling-policy=default',
            '--enable-quic',
          ],
        })

        expect(result.success).toBe(true)
        expect(extractFetchResults(result.parsed)['/enforced-proxy']).toEqual({
          status: '200',
          body: 'ok:/enforced-proxy',
        })
      },
      TEST_TIMEOUT
    )

    test(
      'real HTTPS traffic uses CONNECT',
      async () => {
        const result = await runEgress(
          `
    const page = await ctx.browserContext.newPage()
    const response = await page.goto('https://localhost:${tlsServerPort}/secure')
    ctx.output.info('challenge', 'https:' + response.status() + ':' + await response.text())
    await page.close()`,
          { puppeteerLaunchOptionsExtra: { acceptInsecureCerts: true } }
        )

        expect(result.success).toBe(true)
        expect(hasChallengeLog(result.parsed, 'https:200:secure-ok')).toBe(true)
      },
      TEST_TIMEOUT
    )

    test(
      'allows and denies secure WebSockets through CONNECT policy',
      async () => {
        const connectionsBeforeAllowed = tlsWebsocketConnections
        const allowed = await runEgress(websocketHandler(), {
          puppeteerLaunchOptionsExtra: { acceptInsecureCerts: true },
        })
        expect(allowed.success).toBe(true)
        expect(tlsWebsocketConnections).toBe(connectionsBeforeAllowed + 1)
        expect(hasChallengeLog(allowed.parsed, 'websocket:echo:hello')).toBe(
          true
        )

        const connectionsBeforeDenied = tlsWebsocketConnections
        const denied = await runEgress(websocketHandler(), {
          puppeteerLaunchOptionsExtra: { acceptInsecureCerts: true },
          restrictDomains: {
            host: { disallowRegex: [r('^localhost$')] },
          },
        })
        expect(denied.success).toBe(true)
        expect(tlsWebsocketConnections).toBe(connectionsBeforeDenied)
        expect(hasChallengeLog(denied.parsed, 'websocket:blocked')).toBe(true)
      },
      TEST_TIMEOUT
    )

    test(
      'does not send WebRTC STUN packets outside the proxy',
      async () => {
        const packetsBefore = stunPackets
        const result = await runEgress(`
    const page = await ctx.browserContext.newPage()
    await page.goto('about:blank')
    await page.evaluate(async port => {
      if (typeof RTCPeerConnection === 'undefined') return
      const connection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:127.0.0.1:' + port }],
      })
      connection.createDataChannel('test')
      await connection.setLocalDescription(await connection.createOffer())
      await new Promise(resolve => setTimeout(resolve, 1500))
      connection.close()
    }, ${stunPort})
    await page.close()`)

        expect(result.success).toBe(true)
        expect(stunPackets).toBe(packetsBefore)
      },
      TEST_TIMEOUT
    )

    test(
      'blocks allowed-origin redirects to private and metadata addresses',
      async () => {
        const deniedBefore = browserManager.egressProxy.stats.denied
        const result = await runEgress(`
    const page = await ctx.browserContext.newPage()
    await page.goto('about:blank')
    for (const url of [
      'http://localhost:${serverPort}/redirect-private',
      'http://169.254.169.254/latest/meta-data/',
    ]) {
      try {
        await page.goto(url, { timeout: 3000 })
      } catch {}
    }
    await page.close()`)

        expect(result.success).toBe(true)
        expect(browserManager.egressProxy.stats.denied).toBeGreaterThanOrEqual(
          deniedBefore + 2
        )
      },
      TEST_TIMEOUT
    )

    test(
      'host deny takes precedence over URL allow',
      async () => {
        const result = await runEgress(
          makeFetchHandler(['/blocked'], 'about:blank'),
          {
            restrictDomains: {
              host: { disallowRegex: [r(`^${TEST_HOST}$`)] },
              url: { allowRegex: [r('/blocked')] },
            },
          }
        )
        expect(extractFetchResults(result.parsed)['/blocked']?.status).toBe(
          'error'
        )
      },
      TEST_TIMEOUT
    )

    test(
      'URL allow and deny rules preserve precedence',
      async () => {
        const result = await runEgress(
          makeFetchHandler([
            '/secret',
            '/api/public',
            '/api/private',
            '/other',
          ]),
          {
            restrictDomains: {
              url: {
                allowRegex: [r('/api/public')],
                disallowRegex: [r('/secret'), r('/api/')],
              },
            },
          }
        )

        expect(extractFetchResults(result.parsed)).toMatchObject({
          '/secret': { status: '403' },
          '/api/public': { status: '200' },
          '/api/private': { status: '403' },
          '/other': { status: '200' },
        })
      },
      TEST_TIMEOUT
    )
  })
}

test(
  'Firefox fails closed after its proxy session is stopped',
  async () => {
    const proxy = new EgressProxy({
      allowPrivateCidrs: ['127.0.0.0/8'],
      lookup: async () => [{ address: '127.0.0.1', family: 4 }],
    })
    const manager = new BrowserManager(BROWSER_CACHE_DIR, proxy)
    const userDataDir = await mkdtemp(join(tmpdir(), 'rctf-egress-e2e-'))
    const managed = await manager.launchBrowser({
      version: { browser: 'firefox', version: 'stable' },
      timeoutMilliseconds: 10_000,
      puppeteerLaunchOptionsExtra: { userDataDir },
    })
    const context = await managed.browser.createBrowserContext()
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(3_000)

    try {
      const response = await page.goto(testUrl('/before-close'))
      expect(response?.status()).toBe(200)
      await proxy.closeAllSessions()
      await expect(page.goto(testUrl('/after-close'))).rejects.toThrow()
    } finally {
      await context.close()
      await managed.close()
      await rm(userDataDir, { recursive: true, force: true })
    }
  },
  TEST_TIMEOUT
)

for (const browser of browsers) {
  test(
    `default address policy blocks localhost without restrictDomains [${browser}]`,
    async () => {
      const defaultDenyManager = new BrowserManager(BROWSER_CACHE_DIR)
      const result = await runChallenge({
        browserManager: defaultDenyManager,
        source: challengeSource({
          browser,
          handler: `
    const page = await ctx.browserContext.newPage()
    await page.goto('about:blank')
    const status = await page.evaluate(async () => {
      try {
        await fetch('http://127.0.0.1:${serverPort}/default-deny')
        return 'connected'
      } catch {
        return 'blocked'
      }
    })
    ctx.output.info('challenge', status)
    await page.close()`,
        }),
      })

      expect(result.success).toBe(true)
      expect(hasChallengeLog(result.parsed, 'blocked')).toBe(true)
    },
    TEST_TIMEOUT
  )
}
