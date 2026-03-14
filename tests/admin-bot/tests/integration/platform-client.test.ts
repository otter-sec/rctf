import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { PlatformClient } from '../../../../apps/admin-bot/src/core/platform'

describe('PlatformClient', () => {
  const BASE_URL = 'http://localhost:9999'
  const SECRET_KEY = 'test-secret'
  let client: PlatformClient
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    client = new PlatformClient(BASE_URL, SECRET_KEY)
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('pullJob', () => {
    test('POST to correct URL with Bearer auth', async () => {
      let capturedUrl: string | undefined
      let capturedInit: RequestInit | undefined

      globalThis.fetch = async (url: any, init?: any) => {
        capturedUrl = url.toString()
        capturedInit = init
        return new Response(
          JSON.stringify({
            kind: 'goodPullJob',
            data: {
              job: {
                id: 'job-1',
                challengeId: 'chal-1',
                configRevision: 'rev-1',
                userId: 'user-1',
                submittedAt: '2024-01-01T00:00:00Z',
                flag: 'flag{test}',
                inputs: { url: 'http://example.com' },
                instancerInstances: [],
              },
            },
          })
        )
      }

      const job = await client.pullJob()
      expect(capturedUrl).toBe(
        'http://localhost:9999/api/v2/admin/admin-bot/jobs/pull'
      )
      expect(capturedInit?.method).toBe('POST')
      expect(capturedInit?.headers).toEqual({
        Authorization: 'Bearer test-secret',
      })
      expect(job).not.toBeNull()
      expect(job!.id).toBe('job-1')
    })

    test('returns null job when data.job is null', async () => {
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({ kind: 'goodPullJob', data: { job: null } })
        )

      const job = await client.pullJob()
      expect(job).toBeNull()
    })

    test('returns null on non-ok response', async () => {
      globalThis.fetch = async () => new Response('error', { status: 500 })

      const result = await client.pullJob()
      expect(result).toBeNull()
    })
  })

  describe('fetchChallengeSource', () => {
    test('GET with challengeId in path', async () => {
      let capturedUrl: string | undefined
      let capturedInit: RequestInit | undefined

      globalThis.fetch = async (url: any, init?: any) => {
        capturedUrl = url.toString()
        capturedInit = init
        return new Response(
          JSON.stringify({
            kind: 'goodChallengeSource',
            data: {
              sourceCode: 'export const challenge = ...',
              configRevision: 'rev-1',
            },
          })
        )
      }

      const source = await client.fetchChallengeSource('chal-123')
      expect(capturedUrl).toBe(
        'http://localhost:9999/api/v2/admin/admin-bot/challenges/chal-123/source'
      )
      expect(capturedInit?.method).toBe('GET')
      expect(capturedInit?.headers).toEqual({
        Authorization: 'Bearer test-secret',
      })
      expect(source).not.toBeNull()
      expect(source!.sourceCode).toBe('export const challenge = ...')
    })

    test('returns null on non-ok response', async () => {
      globalThis.fetch = async () => new Response('not found', { status: 404 })

      const result = await client.fetchChallengeSource('missing')
      expect(result).toBeNull()
    })
  })

  describe('completeJob', () => {
    test('POST with jobId and logs body', async () => {
      let capturedUrl: string | undefined
      let capturedBody: string | undefined

      globalThis.fetch = async (url: any, init?: any) => {
        capturedUrl = url.toString()
        capturedBody = init?.body
        return new Response(
          JSON.stringify({ kind: 'goodComplete', data: { ok: true } })
        )
      }

      const result = await client.completeJob('job-42', 'some logs')
      expect(capturedUrl).toBe(
        'http://localhost:9999/api/v2/admin/admin-bot/jobs/job-42/complete'
      )
      expect(JSON.parse(capturedBody!)).toEqual({ logs: 'some logs' })
      expect(result).toBe(true)
    })

    test('returns false on non-ok response', async () => {
      globalThis.fetch = async () => new Response('error', { status: 500 })

      const result = await client.completeJob('job-42', 'logs')
      expect(result).toBe(false)
    })
  })

  describe('failJob', () => {
    test('POST with jobId and logs body', async () => {
      let capturedUrl: string | undefined
      let capturedBody: string | undefined

      globalThis.fetch = async (url: any, init?: any) => {
        capturedUrl = url.toString()
        capturedBody = init?.body
        return new Response(
          JSON.stringify({ kind: 'goodFail', data: { ok: true } })
        )
      }

      const result = await client.failJob('job-99', 'failure logs')
      expect(capturedUrl).toBe(
        'http://localhost:9999/api/v2/admin/admin-bot/jobs/job-99/fail'
      )
      expect(JSON.parse(capturedBody!)).toEqual({ logs: 'failure logs' })
      expect(result).toBe(true)
    })

    test('returns false on non-ok response', async () => {
      globalThis.fetch = async () => new Response('error', { status: 500 })

      const result = await client.failJob('job-99', 'logs')
      expect(result).toBe(false)
    })
  })

  test('strips trailing slashes from baseUrl', async () => {
    const clientWithSlash = new PlatformClient(
      'http://localhost:9999///',
      SECRET_KEY
    )

    let capturedUrl: string | undefined
    globalThis.fetch = async (url: any) => {
      capturedUrl = url.toString()
      return new Response(JSON.stringify({ kind: 'good', data: { job: null } }))
    }

    await clientWithSlash.pullJob()
    expect(capturedUrl).toBe(
      'http://localhost:9999/api/v2/admin/admin-bot/jobs/pull'
    )
  })
})
