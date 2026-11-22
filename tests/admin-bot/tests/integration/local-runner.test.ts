import { describe, expect, spyOn, test } from 'bun:test'
import { BrowserManager } from '../../../../apps/admin-bot/src/browser/manager'
import {
  decodeLocalRunnerEvent,
  encodeLocalRunnerEvent,
} from '../../../../apps/admin-bot/src/local-protocol'
import {
  inspectLocalChallenge,
  runLocalChallenge,
} from '../../../../apps/admin-bot/src/local-runner'

describe('local runner inspection', () => {
  test('returns the config fields needed by the CLI', async () => {
    const inspection = await inspectLocalChallenge(`
      const { Challenge } = require('../types')
      export const challenge = new Challenge({
        timeoutMilliseconds: 12345,
        requireInstancerInstancesRunning: true,
        browser: 'firefox',
        restrictDomains: {
          host: { disallowRegex: [{ pattern: '.*' }] },
        },
        inputs: { url: { pattern: '^https://example\\\\.com/.*$' } },
        handler: async () => {},
      })
    `)

    expect(inspection).toEqual({
      inputs: { url: { pattern: '^https://example\\.com/.*$' } },
      timeoutMilliseconds: 12345,
      requireInstancerInstancesRunning: true,
      hasDomainRestrictions: true,
      browser: 'firefox',
    })
  })

  test('treats allow-only domain rules as non-blocking', async () => {
    const inspection = await inspectLocalChallenge(`
      const { Challenge } = require('../types')
      export const challenge = new Challenge({
        timeoutMilliseconds: 5000,
        restrictDomains: {
          host: { allowRegex: [{ pattern: '^challenge\\.example$' }] },
        },
        inputs: {},
        handler: async () => {},
      })
    `)

    expect(inspection.hasDomainRestrictions).toBe(false)
  })

  test('rejects invalid challenge source', async () => {
    expect(inspectLocalChallenge('export const nope = true')).rejects.toThrow(
      'missing challenge export'
    )
  })
})

describe('local runner protocol', () => {
  test('ignores challenge output and validates framed events', () => {
    expect(decodeLocalRunnerEvent('challenge debug output')).toBeUndefined()

    const event = { type: 'log', line: 'structured log' } as const
    expect(decodeLocalRunnerEvent(encodeLocalRunnerEvent(event))).toEqual(event)
    expect(() => decodeLocalRunnerEvent('@@rctf-admin-bot-event:nope')).toThrow(
      'Invalid JSON'
    )
  })
})

describe('local runner failures', () => {
  test('includes the original error as structured log details', async () => {
    const launchBrowser = spyOn(
      BrowserManager.prototype,
      'launchBrowser'
    ).mockRejectedValue(new Error('browser exploded'))

    try {
      const result = await runLocalChallenge({
        action: 'run',
        source: `
          const { Challenge } = require('../types')
          export const challenge = new Challenge({
            timeoutMilliseconds: 5000,
            inputs: {},
            handler: async () => {},
          })
        `,
        inputs: {},
        job: {
          challengeId: 'local-challenge',
          configRevision: 'local',
          userId: 'local-user',
          submittedAt: new Date().toISOString(),
          flags: [{ provider: 'flags/local', flag: 'rctf{local_test_flag}' }],
          flag: 'rctf{local_test_flag}',
          instancerInstances: [],
        },
        options: { live: false },
      })

      expect(result.succeeded).toBe(false)
      const fatal = result.logs
        .split('\n')
        .map(line => JSON.parse(line))
        .find(entry => entry.level === 'fatal')
      expect(fatal.line).toBe('local admin-bot run failed')
      expect(fatal.extra.error).toBe('browser exploded')
      expect(fatal.extra.stack).toContain('browser exploded')
    } finally {
      launchBrowser.mockRestore()
    }
  })
})
