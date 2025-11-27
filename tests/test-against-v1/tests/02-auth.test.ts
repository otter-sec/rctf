import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  all,
  assertAllKind,
  assertSame,
  assertSameKind,
  cleanupUser,
  registerUser,
  testId,
  type TestUser,
} from '../lib/harness'

describe('Auth - Registration', () => {
  let testUser: TestUser | null = null

  afterAll(async () => {
    if (testUser) {
      await cleanupUser(testUser)
    }
  })

  test('POST /api/v1/auth/register with valid name returns authToken', async () => {
    const name = testId('RegTest')
    testUser = await registerUser(name)

    expect(Object.keys(testUser.tokens).length).toBeGreaterThan(0)
    for (const token of Object.values(testUser.tokens)) {
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    }
  })

  test('POST /api/v1/auth/register without name returns error', async () => {
    const res = await all('/api/v1/auth/register', {
      method: 'POST',
      body: {},
    })

    assertSameKind(res)
    for (const r of Object.values(res)) {
      expect(r.status).toBeGreaterThanOrEqual(400)
    }
  })
})

describe('Auth - Login', () => {
  test('POST /api/v1/auth/login without credentials returns error', async () => {
    const res = await all('/api/v1/auth/login', {
      method: 'POST',
      body: {},
    })

    assertSameKind(res)
    for (const r of Object.values(res)) {
      expect(r.status).toBeGreaterThanOrEqual(400)
    }
  })

  test('POST /api/v1/auth/login with invalid teamToken returns error', async () => {
    const res = await all('/api/v1/auth/login', {
      method: 'POST',
      body: { teamToken: 'invalid-token-12345' },
    })

    assertSameKind(res)
    for (const r of Object.values(res)) {
      expect(r.status).toBeGreaterThanOrEqual(400)
    }
  })

  test('POST /api/v1/auth/login with invalid ctftimeToken returns error', async () => {
    const res = await all('/api/v1/auth/login', {
      method: 'POST',
      body: { ctftimeToken: 'invalid-ctftime-token' },
    })

    assertSameKind(res)
    for (const r of Object.values(res)) {
      expect(r.status).toBeGreaterThanOrEqual(400)
    }
  })
})

describe('Auth - Recover', () => {
  test('POST /api/v1/auth/recover without email config returns consistent response', async () => {
    const res = await all('/api/v1/auth/recover', {
      method: 'POST',
      body: { email: 'test@example.com' },
    })

    // Without email configured, both should return same error
    assertSameKind(res)
  })
})

describe('Auth - Verify', () => {
  test('POST /api/v1/auth/verify with invalid token returns error', async () => {
    const res = await all('/api/v1/auth/verify', {
      method: 'POST',
      body: { verifyToken: 'invalid-verify-token' },
    })

    assertSameKind(res)
    assertAllKind(res, 'badTokenVerification')
  })

  test('POST /api/v1/auth/verify without token returns error', async () => {
    const res = await all('/api/v1/auth/verify', {
      method: 'POST',
      body: {},
    })

    assertSameKind(res)
    for (const r of Object.values(res)) {
      expect(r.status).toBeGreaterThanOrEqual(400)
    }
  })
})

describe('Auth - Test Auth', () => {
  test('GET /api/v1/auth/test without auth returns badToken', async () => {
    const res = await all('/api/v1/auth/test')

    assertSameKind(res)
    assertAllKind(res, 'badToken')
  })

  test('GET /api/v1/auth/test with invalid auth returns badToken', async () => {
    const res = await all('/api/v1/auth/test', {
      headers: { Authorization: 'Bearer invalid-token' },
    })

    assertSameKind(res)
    assertAllKind(res, 'badToken')
  })
})
