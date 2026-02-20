import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'
import { ChallengeLoader } from '../../../../apps/admin-bot/src/core/loader'
import {
  processJob,
  ensureChallengeLoaded,
} from '../../../../apps/admin-bot/src/core/poller'
import { BrowserManager } from '../../../../apps/admin-bot/src/browser/manager'
import { PlatformClient } from '../../../../apps/admin-bot/src/core/platform'
import type { PulledJob } from '../../../../apps/admin-bot/src/core/platform'

const validChallengeSource = `
const { Challenge } = require('../types')
export const challenge = new Challenge({
  timeoutMilliseconds: 100,
  inputs: { url: '^https?://.*' },
  handler: async (ctx) => {},
  hooksConfig: {
    showConsoleLogs: false,
    showBrowserErrors: false,
    showNavigation: false,
    limitTabsNumber: -1,
  },
})
`

const makeJob = (overrides: Partial<PulledJob> = {}): PulledJob => ({
  id: 'job-1',
  challengeId: 'chal-1',
  configRevision: 'rev-1',
  userId: 'user-1',
  submittedAt: '2024-01-01T00:00:00Z',
  flag: 'flag{test}',
  inputs: { url: 'http://example.com' },
  instancerInstances: [],
  ...overrides,
})

describe('ensureChallengeLoaded', () => {
  let challenges: ChallengeLoader
  let platform: PlatformClient
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    challenges = new ChallengeLoader()
    platform = new PlatformClient('http://localhost:9999', 'secret')
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('returns true immediately for cached challenge', async () => {
    await challenges.loadFromSource('chal-1', 'rev-1', validChallengeSource)

    const result = await ensureChallengeLoaded(
      challenges,
      platform,
      'chal-1',
      'rev-1'
    )
    expect(result).toBe(true)
  })

  test('fetches from platform on cache miss', async () => {
    globalThis.fetch = async (url: any) => {
      const urlStr = url.toString()
      if (urlStr.includes('/source')) {
        return new Response(
          JSON.stringify({
            kind: 'good',
            data: {
              sourceCode: validChallengeSource,
              configRevision: 'rev-1',
            },
          })
        )
      }
      return new Response('not found', { status: 404 })
    }

    const result = await ensureChallengeLoaded(
      challenges,
      platform,
      'chal-1',
      'rev-1'
    )
    expect(result).toBe(true)
    expect(challenges.get('chal-1', 'rev-1')).toBeDefined()
  })

  test('returns false when platform returns null source', async () => {
    globalThis.fetch = async () => new Response('not found', { status: 404 })

    const result = await ensureChallengeLoaded(
      challenges,
      platform,
      'chal-1',
      'rev-1'
    )
    expect(result).toBe(false)
  })
})

describe('processJob', () => {
  let challenges: ChallengeLoader
  let browserManager: BrowserManager
  let platform: PlatformClient
  let originalFetch: typeof globalThis.fetch
  let completedJobs: { id: string; logs?: string }[]
  let failedJobs: { id: string; logs?: string }[]

  beforeEach(async () => {
    challenges = new ChallengeLoader()
    browserManager = new BrowserManager()
    platform = new PlatformClient('http://localhost:9999', 'secret')
    originalFetch = globalThis.fetch
    completedJobs = []
    failedJobs = []

    globalThis.fetch = async (url: any, init?: any) => {
      const urlStr = url.toString()
      if (urlStr.includes('/complete')) {
        const body = init?.body ? JSON.parse(init.body) : {}
        completedJobs.push({ id: 'job-1', logs: body.logs })
        return new Response(
          JSON.stringify({ kind: 'good', data: { ok: true } })
        )
      }
      if (urlStr.includes('/fail')) {
        const body = init?.body ? JSON.parse(init.body) : {}
        failedJobs.push({ id: 'job-1', logs: body.logs })
        return new Response(
          JSON.stringify({ kind: 'good', data: { ok: true } })
        )
      }
      if (urlStr.includes('/source')) {
        return new Response(
          JSON.stringify({
            kind: 'good',
            data: {
              sourceCode: validChallengeSource,
              configRevision: 'rev-1',
            },
          })
        )
      }
      return new Response('not found', { status: 404 })
    }
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('successful flow: load source, run handler, completeJob', async () => {
    await challenges.loadFromSource('chal-1', 'rev-1', validChallengeSource)
    await processJob(challenges, browserManager, platform, makeJob())

    expect(completedJobs.length).toBe(1)
    expect(completedJobs[0].logs).toContain('finished visiting')
    expect(failedJobs.length).toBe(0)
  })

  test('failure: source not loadable -> failJob', async () => {
    // Do not preload challenge, and make source endpoint fail
    globalThis.fetch = async (url: any, init?: any) => {
      const urlStr = url.toString()
      if (urlStr.includes('/fail')) {
        const body = init?.body ? JSON.parse(init.body) : {}
        failedJobs.push({ id: 'job-1', logs: body.logs })
        return new Response(
          JSON.stringify({ kind: 'good', data: { ok: true } })
        )
      }
      return new Response('not found', { status: 404 })
    }

    await processJob(challenges, browserManager, platform, makeJob())
    expect(failedJobs.length).toBe(1)
    expect(completedJobs.length).toBe(0)
  })

  test('timeout: handler exceeds limit -> failJob with timed out', async () => {
    const timeoutSource = `
      const { Challenge } = require('../types')
      export const challenge = new Challenge({
        timeoutMilliseconds: 50,
        inputs: { url: '^https?://.*' },
        handler: async (ctx) => {
          await new Promise(resolve => setTimeout(resolve, 10000))
        },
        hooksConfig: {
          showConsoleLogs: false,
          showBrowserErrors: false,
          showNavigation: false,
          limitTabsNumber: -1,
        },
      })
    `
    await challenges.loadFromSource('chal-1', 'rev-1', timeoutSource)
    await processJob(challenges, browserManager, platform, makeJob())

    expect(failedJobs.length).toBe(1)
    expect(failedJobs[0].logs).toContain('timed out')
    expect(completedJobs.length).toBe(0)
  })

  test('non-timeout error -> failJob with internal server error', async () => {
    const errorSource = `
      const { Challenge } = require('../types')
      export const challenge = new Challenge({
        timeoutMilliseconds: 5000,
        inputs: { url: '^https?://.*' },
        handler: async (ctx) => {
          throw new Error('something broke')
        },
        hooksConfig: {
          showConsoleLogs: false,
          showBrowserErrors: false,
          showNavigation: false,
          limitTabsNumber: -1,
        },
      })
    `
    await challenges.loadFromSource('chal-1', 'rev-1', errorSource)
    await processJob(challenges, browserManager, platform, makeJob())

    expect(failedJobs.length).toBe(1)
    expect(failedJobs[0].logs).toContain('hit internal server error')
    expect(completedJobs.length).toBe(0)
  })
})
