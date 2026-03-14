import { describe, expect, test } from 'bun:test'
import { app } from '../../../../apps/admin-bot/src/index'

const SECRET_KEY = process.env.RCTF_SECRET_KEY!

const validChallengeSource = `
const { Challenge } = require('../types')
export const challenge = new Challenge({
  timeoutMilliseconds: 10000,
  inputs: { url: { pattern: '^https?://.*' } },
  handler: async (ctx) => {},
  hooksConfig: {
    showConsoleLogs: false,
    showBrowserErrors: false,
    showNavigation: false,
    limitTabsNumber: -1,
  },
  requireInstancerInstancesRunning: true,
})
`

describe('/v1/test endpoint', () => {
  describe('authentication', () => {
    test('401 without token', async () => {
      const res = await app.request('/v1/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'test' }),
      })
      expect(res.status).toBe(401)
    })

    test('401 with wrong token', async () => {
      const res = await app.request('/v1/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer wrong-token',
        },
        body: JSON.stringify({ source: 'test' }),
      })
      expect(res.status).toBe(401)
    })

    test('200 with correct token', async () => {
      const res = await app.request('/v1/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SECRET_KEY}`,
        },
        body: JSON.stringify({ source: validChallengeSource }),
      })
      expect(res.status).toBe(200)
    })
  })

  describe('validation', () => {
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SECRET_KEY}`,
    }

    test('400 for missing source', async () => {
      const res = await app.request('/v1/test', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.detail).toBe('invalid body')
    })

    test('400 for non-string source', async () => {
      const res = await app.request('/v1/test', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ source: 123 }),
      })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.detail).toBe('invalid body')
    })
  })

  describe('valid source', () => {
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SECRET_KEY}`,
    }

    test('returns inputs, timeoutMilliseconds, requireInstancerInstancesRunning', async () => {
      const res = await app.request('/v1/test', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ source: validChallengeSource }),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.inputs).toEqual({ url: { pattern: '^https?://.*' } })
      expect(body.timeoutMilliseconds).toBe(10000)
      expect(body.requireInstancerInstancesRunning).toBe(true)
    })
  })

  describe('invalid source', () => {
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SECRET_KEY}`,
    }

    test('returns detail with error message', async () => {
      const res = await app.request('/v1/test', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ source: 'not valid code <<<' }),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.detail).toBeDefined()
      expect(typeof body.detail).toBe('string')
    })
  })
})
