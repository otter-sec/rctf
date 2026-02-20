import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import {
  runChallenge,
  challengeSource,
  browserManager,
  type ParsedLog,
} from './helper'
import { defaultChromeArguments } from '../../../apps/admin-bot/src/core/const'

// TODO(es3n1n): test on firefox :clueless:
const TEST_TIMEOUT = 30_000
// Chrome always bypasses proxy for localhost/127.0.0.1 regardless of
// --proxy-bypass-list. In production this is fine because admin bots
// visit real hostnames. For tests we map a fake hostname to 127.0.0.1
// via --host-resolver-rules so the PAC applies properly.
const TEST_HOST = 'pac-test.local'

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

  await browserManager.getBrowserPath({ browser: 'chrome', version: 'stable' })
}, 120_000)

afterAll(() => {
  server.stop(true)
})

const testUrl = (path: string): string =>
  `http://${TEST_HOST}:${serverPort}${path}`

const r = (pattern: string, flags?: string) => ({ pattern, flags })

// Default chrome args + host resolver rule so PAC can apply to our test server
const chromeArgs = [
  ...defaultChromeArguments,
  `--host-resolver-rules=MAP ${TEST_HOST} 127.0.0.1`,
]

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

describe('PAC e2e', () => {
  test(
    'no restrictions — all fetches succeed',
    async () => {
      const result = await runChallenge({
        source: challengeSource({
          handler: makeFetchHandler(['/hello', '/world']),
          browserArguments: chromeArgs,
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
          browserArguments: chromeArgs,
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
          browserArguments: chromeArgs,
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
          handler: makeFetchHandler(['/api/public', '/api/private', '/other']),
          browserArguments: chromeArgs,
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
          browserArguments: chromeArgs,
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
          browserArguments: chromeArgs,
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
