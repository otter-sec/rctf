import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  defaultChromeArguments,
  defaultFirefoxArguments,
  defaultFirefoxPreferences,
} from '../../../apps/admin-bot/src/core/const'
import {
  browserManager,
  browsers,
  challengeSource,
  runChallenge,
  type BrowserType,
  type ParsedLog,
} from './helper'

const TEST_TIMEOUT = 30_000
// Both Chrome and Firefox bypass proxy for localhost/127.0.0.1 by default.
// We use a fake hostname mapped to 127.0.0.1 so PAC applies properly:
const TEST_HOST = 'pac-test.local'

interface BrowserPacConfig {
  browserArgs: string[]
  extraPrefsFirefox?: Record<string, unknown>
}

const pacBrowserConfigs: Record<BrowserType, BrowserPacConfig> = {
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

beforeAll(async () => {
  server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    fetch(req) {
      return new Response(`ok:${new URL(req.url).pathname}`, { status: 200 })
    },
  })
  serverPort = server.port!
}, 5_000)

afterAll(() => {
  server.stop(true)
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

const navHandler = (url: string): string => `
    const page = await ctx.browserContext.newPage()
    try {
      const resp = await page.goto(${JSON.stringify(url)}, {
        timeout: 8000,
        waitUntil: 'domcontentloaded',
      })
      ctx.output.info('challenge', 'nav:ok:' + resp.status())
    } catch (e) {
      ctx.output.info('challenge', 'nav:err:' + e.message)
    }
    await page.close()`

const navOutcome = (parsed: ParsedLog[]): string => {
  const log = parsed.find(
    l => typeof l.line === 'string' && l.line.startsWith('nav:')
  )
  return log ? (log.line as string) : ''
}

const hostRegex = (host: string): string => `^${host.replace(/\./g, '\\.')}$`
describe('PAC e2e - loopback bypass regression', () => {
  for (const browser of browsers) {
    const { browserArgs, extraPrefsFirefox } = pacBrowserConfigs[browser]

    describe(`[${browser}]`, () => {
      beforeAll(async () => {
        await browserManager.getBrowserPath({ browser, version: 'stable' })
      }, 120_000)

      for (const host of ['localhost', '127.0.0.1']) {
        const url = () => `http://${host}:${serverPort}/loopback`

        test(
          `allows ${host} when host is permitted`,
          async () => {
            const result = await runChallenge({
              source: challengeSource({
                handler: navHandler(url()),
                browser,
                browserArguments: browserArgs,
                extraPrefsFirefox,
                restrictDomains: {
                  host: { allowRegex: [r(hostRegex(host))] },
                },
              }),
            })

            expect(navOutcome(result.parsed)).toBe('nav:ok:200')
          },
          TEST_TIMEOUT
        )

        test(
          `blocks ${host} when host is disallowed`,
          async () => {
            const result = await runChallenge({
              source: challengeSource({
                handler: navHandler(url()),
                browser,
                browserArguments: browserArgs,
                extraPrefsFirefox,
                restrictDomains: {
                  host: { disallowRegex: [r(hostRegex(host))] },
                },
              }),
            })

            expect(navOutcome(result.parsed)).toStartWith('nav:err:')
          },
          TEST_TIMEOUT
        )
      }
    })
  }
})

describe('PAC e2e [chrome] - metadata SSRF', () => {
  const METADATA_URL = 'http://169.254.169.254/latest/meta-data/'

  beforeAll(async () => {
    await browserManager.getBrowserPath({
      browser: 'chrome',
      version: 'stable',
    })
  }, 120_000)

  test(
    'routes disallowed link-local metadata through the proxy, not direct',
    async () => {
      const result = await runChallenge({
        source: challengeSource({
          handler: navHandler(METADATA_URL),
          browser: 'chrome',
          browserArguments: defaultChromeArguments,
          restrictDomains: {
            host: { disallowRegex: [r(hostRegex('169.254.169.254'))] },
          },
        }),
      })

      expect(navOutcome(result.parsed)).toContain('ERR_PROXY_CONNECTION_FAILED')
    },
    TEST_TIMEOUT
  )
})

for (const browser of browsers) {
  const { browserArgs, extraPrefsFirefox } = pacBrowserConfigs[browser]

  const makeFetchHandler = (
    paths: string[],
    startUrl: string = testUrl('/')
  ): string => {
    const urls = paths.map(p => testUrl(p))
    return `
    const page = await ctx.browserContext.newPage()
    await page.goto('${startUrl}')

    const urls = ${JSON.stringify(urls)}
    for (const url of urls) {
      const result = await page.evaluate(async (fetchUrl) => {
        try {
          const res = await fetch(fetchUrl)
          const body = await res.text()
          return 'fetch:' + new URL(fetchUrl).pathname + ':' + res.status + ':' + body
        } catch (e) {
          return 'fetch:' + new URL(fetchUrl).pathname + ':error:' + e.message
        }
      }, url)
      ctx.output.info('challenge', result)
    }

    await page.close()`
  }

  describe(`PAC e2e [${browser}]`, () => {
    beforeAll(async () => {
      await browserManager.getBrowserPath({ browser, version: 'stable' })
    }, 120_000)

    test(
      'no restrictions - all fetches succeed',
      async () => {
        const result = await runChallenge({
          source: challengeSource({
            handler: makeFetchHandler(['/hello', '/world']),
            browser,
            browserArguments: browserArgs,
            extraPrefsFirefox,
          }),
        })

        expect(result.success).toBe(true)
        const fetches = extractFetchResults(result.parsed)
        expect(fetches['/hello']?.status).toBe('200')
        expect(fetches['/hello']?.body).toBe('ok:/hello')
        expect(fetches['/world']?.status).toBe('200')
      },
      TEST_TIMEOUT
    )

    test(
      'host disallow blocks requests to matching host',
      async () => {
        const result = await runChallenge({
          source: challengeSource({
            handler: makeFetchHandler(['/blocked'], 'about:blank'),
            browser,
            browserArguments: browserArgs,
            extraPrefsFirefox,
            restrictDomains: {
              host: { disallowRegex: [r(`^${TEST_HOST}$`)] },
            },
          }),
        })

        const fetches = extractFetchResults(result.parsed)
        expect(fetches['/blocked']?.status).toBe('error')
      },
      TEST_TIMEOUT
    )

    test(
      'url disallow blocks matching paths, allows others',
      async () => {
        const result = await runChallenge({
          source: challengeSource({
            handler: makeFetchHandler(['/secret', '/public']),
            browser,
            browserArguments: browserArgs,
            extraPrefsFirefox,
            restrictDomains: {
              url: { disallowRegex: [r('/secret')] },
            },
          }),
        })

        const fetches = extractFetchResults(result.parsed)
        expect(fetches['/secret']?.status).toBe('error')
        expect(fetches['/public']?.status).toBe('200')
        expect(fetches['/public']?.body).toBe('ok:/public')
      },
      TEST_TIMEOUT
    )

    test(
      'url allow overrides url disallow for matching patterns',
      async () => {
        const result = await runChallenge({
          source: challengeSource({
            handler: makeFetchHandler([
              '/api/public',
              '/api/private',
              '/other',
            ]),
            browser,
            browserArguments: browserArgs,
            extraPrefsFirefox,
            restrictDomains: {
              url: {
                allowRegex: [r('/api/public')],
                disallowRegex: [r('/api/')],
              },
            },
          }),
        })

        const fetches = extractFetchResults(result.parsed)
        expect(fetches['/api/public']?.status).toBe('200')
        expect(fetches['/api/private']?.status).toBe('error')
        expect(fetches['/other']?.status).toBe('200')
      },
      TEST_TIMEOUT
    )

    test(
      'host rules evaluated before url rules',
      async () => {
        const result = await runChallenge({
          source: challengeSource({
            handler: makeFetchHandler(['/should-not-help'], 'about:blank'),
            browser,
            browserArguments: browserArgs,
            extraPrefsFirefox,
            restrictDomains: {
              host: { disallowRegex: [r(`^${TEST_HOST}$`)] },
              url: { allowRegex: [r('/should-not-help')] },
            },
          }),
        })

        const fetches = extractFetchResults(result.parsed)
        expect(fetches['/should-not-help']?.status).toBe('error')
      },
      TEST_TIMEOUT
    )

    test(
      'host matching is case-insensitive (browser lowercases host)',
      async () => {
        const result = await runChallenge({
          source: challengeSource({
            handler: makeFetchHandler(['/hello'], 'about:blank'),
            browser,
            browserArguments: browserArgs,
            extraPrefsFirefox,
            restrictDomains: {
              host: { disallowRegex: [r(`^${TEST_HOST.toUpperCase()}$`)] },
            },
          }),
        })

        const fetches = extractFetchResults(result.parsed)
        // Uppercase pattern still matches because browser lowercases the host
        expect(fetches['/hello']?.status).toBe('error')
      },
      TEST_TIMEOUT
    )
  })
}
