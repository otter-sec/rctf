import { describe, test, expect, beforeAll } from 'bun:test'
import { Hono } from 'hono'
import { challengeSource, htmlPage, browserManager } from './helper'
import { ChallengeLoader } from '../../../apps/admin-bot/src/core/loader'
import { PlatformClient } from '../../../apps/admin-bot/src/core/platform'
import type { PulledJob } from '../../../apps/admin-bot/src/core/platform'
import { processJob } from '../../../apps/admin-bot/src/core/poller'

beforeAll(async () => {
  await browserManager.getBrowserPath({ browser: 'chrome', version: 'stable' })
}, 120_000)

const createMockPlatform = (
  source: string
): {
  app: Hono
  getCompleted: () => { logs?: string } | null
  getFailed: () => { logs?: string } | null
} => {
  let completed: { logs?: string } | null = null
  let failed: { logs?: string } | null = null

  const app = new Hono()

  app.get('/api/v2/admin/admin-bot/challenges/:id/source', c =>
    c.json({
      kind: 'goodChallengeSource',
      data: { sourceCode: source, configRevision: 'rev-1' },
    })
  )

  app.post('/api/v2/admin/admin-bot/jobs/:id/complete', async c => {
    completed = await c.req.json()
    return c.json({ kind: 'goodComplete', data: { ok: true } })
  })

  app.post('/api/v2/admin/admin-bot/jobs/:id/fail', async c => {
    failed = await c.req.json()
    return c.json({ kind: 'goodFail', data: { ok: true } })
  })

  return {
    app,
    getCompleted: () => completed,
    getFailed: () => failed,
  }
}

const makeJob = (overrides: Partial<PulledJob> = {}): PulledJob => ({
  id: 'pipeline-job-1',
  challengeId: 'pipeline-chal',
  configRevision: 'rev-1',
  userId: 'user-1',
  submittedAt: '2024-01-01T00:00:00Z',
  flag: 'flag{test}',
  inputs: {},
  instancerInstances: [],
  ...overrides,
})

describe('full pipeline via mock platform', () => {
  test('successful job: fetches source, runs handler, reports complete', async () => {
    const url = htmlPage(`<h1>Pipeline OK</h1>`)
    const source = challengeSource({
      handler: `
    const page = await ctx.browserContext.newPage()
    await page.goto('${url}')
    await new Promise(r => setTimeout(r, 200))`,
    })

    const { app, getCompleted, getFailed } = createMockPlatform(source)
    const server = Bun.serve({ port: 0, fetch: app.fetch })

    try {
      const platform = new PlatformClient(
        `http://localhost:${server.port}`,
        'secret'
      )
      const challenges = new ChallengeLoader()
      await processJob(challenges, browserManager, platform, makeJob())

      expect(getCompleted()).not.toBeNull()
      expect(getCompleted()!.logs).toContain('finished visiting')
      expect(getFailed()).toBeNull()
    } finally {
      server.stop()
    }
  }, 30_000)

  test('timeout job: reports failure with timed out', async () => {
    const source = challengeSource({
      handler: `await new Promise(() => {})`,
      timeout: 200,
    })

    const { app, getCompleted, getFailed } = createMockPlatform(source)
    const server = Bun.serve({ port: 0, fetch: app.fetch })

    try {
      const platform = new PlatformClient(
        `http://localhost:${server.port}`,
        'secret'
      )
      const challenges = new ChallengeLoader()
      await processJob(
        challenges,
        browserManager,
        platform,
        makeJob({ id: 'timeout-job' })
      )

      expect(getFailed()).not.toBeNull()
      expect(getFailed()!.logs).toContain('timed out')
      expect(getCompleted()).toBeNull()
    } finally {
      server.stop()
    }
  }, 30_000)

  test('handler error: reports failure with internal server error', async () => {
    const source = challengeSource({
      handler: `throw new Error('boom')`,
    })

    const { app, getCompleted, getFailed } = createMockPlatform(source)
    const server = Bun.serve({ port: 0, fetch: app.fetch })

    try {
      const platform = new PlatformClient(
        `http://localhost:${server.port}`,
        'secret'
      )
      const challenges = new ChallengeLoader()
      await processJob(
        challenges,
        browserManager,
        platform,
        makeJob({ id: 'error-job' })
      )

      expect(getFailed()).not.toBeNull()
      expect(getFailed()!.logs).toContain('hit internal server error')
      expect(getCompleted()).toBeNull()
    } finally {
      server.stop()
    }
  }, 30_000)

  test('invalid source: reports failure without launching browser', async () => {
    const mockApp = new Hono()

    let failCalled = false
    mockApp.get('/api/v2/admin/admin-bot/challenges/:id/source', c =>
      c.json({
        kind: 'goodChallengeSource',
        data: { sourceCode: 'not valid <<<>>>', configRevision: 'rev-1' },
      })
    )
    mockApp.post('/api/v2/admin/admin-bot/jobs/:id/fail', async c => {
      failCalled = true
      return c.json({ kind: 'goodFail', data: { ok: true } })
    })
    mockApp.post('/api/v2/admin/admin-bot/jobs/:id/complete', async c =>
      c.json({ kind: 'goodComplete', data: { ok: true } })
    )

    const server = Bun.serve({ port: 0, fetch: mockApp.fetch })

    try {
      const platform = new PlatformClient(
        `http://localhost:${server.port}`,
        'secret'
      )
      const challenges = new ChallengeLoader()
      await processJob(
        challenges,
        browserManager,
        platform,
        makeJob({ id: 'bad-source-job' })
      )

      expect(failCalled).toBe(true)
    } finally {
      server.stop()
    }
  }, 30_000)
})
