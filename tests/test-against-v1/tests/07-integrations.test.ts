import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  all,
  allAs,
  assertAllKind,
  assertAllSuccess,
  assertSame,
  assertSameKind,
  cleanupChallenge,
  cleanupUser,
  createChallenge,
  makeAdmin,
  refreshLeaderboard,
  registerUser,
  submitFlag,
  testId,
  type TestUser,
} from '../lib/harness'

describe('Integrations - CTFtime Callback', () => {
  test('POST /api/v1/integrations/ctftime/callback with code returns badEndpoint when not configured', async () => {
    const res = await all('/api/v1/integrations/ctftime/callback', {
      method: 'POST',
      body: { ctftimeCode: 'fake-code' },
    })

    assertSame(res)
    assertAllKind(res, 'badEndpoint')
  })

  test('POST /api/v1/integrations/ctftime/callback without code returns error', async () => {
    const res = await all('/api/v1/integrations/ctftime/callback', {
      method: 'POST',
      body: {},
    })

    assertSameKind(res)
    for (const r of Object.values(res)) {
      expect(r.status).toBeGreaterThanOrEqual(400)
    }
  })
})

describe('Integrations - CTFtime Leaderboard', () => {
  test('GET /api/v1/integrations/ctftime/leaderboard without auth returns badToken', async () => {
    const res = await all('/api/v1/integrations/ctftime/leaderboard')

    assertSame(res)
    assertAllKind(res, 'badToken')
  })

  test('GET /api/v1/integrations/ctftime/leaderboard with invalid auth returns badToken', async () => {
    const res = await all('/api/v1/integrations/ctftime/leaderboard', {
      headers: { Authorization: 'Bearer invalid-token' },
    })

    assertSame(res)
    assertAllKind(res, 'badToken')
  })
})

describe('Integrations - Client Config Deep Validation', () => {
  test('client config values are consistent between instances', async () => {
    const res = await all('/api/v1/integrations/client/config')

    assertAllSuccess(res)

    // Verify all have same ctfName
    const ctfNames = Object.values(res).map(
      r => (r.body as { data: { ctfName: string } }).data.ctfName
    )
    expect(ctfNames.every(n => n === ctfNames[0])).toBe(true)
  })

  test('divisions in config are valid', async () => {
    const res = await all('/api/v1/integrations/client/config')

    for (const r of Object.values(res)) {
      const body = r.body as {
        data: { divisions: Record<string, string> }
      }
      expect(Object.keys(body.data.divisions).length).toBeGreaterThan(0)
      expect(body.data.divisions['open']).toBeDefined()
    }
  })

  test('time configuration is valid', async () => {
    const res = await all('/api/v1/integrations/client/config')

    for (const r of Object.values(res)) {
      const body = r.body as {
        data: { startTime: number; endTime: number }
      }
      expect(body.data.startTime).toBeLessThan(body.data.endTime)
    }
  })
})

describe('Integrations - CTFtime Leaderboard With Data', () => {
  let admin: TestUser
  let users: TestUser[] = []
  const challengeId = testId('int-chall')
  const flag = 'flag{integration-test}'

  beforeAll(async () => {
    admin = await registerUser(testId('IntAdmin'))
    await makeAdmin(admin)

    await createChallenge(admin, challengeId, {
      name: 'Integration Challenge',
      description: 'Test',
      category: 'test',
      author: 'Test',
      flag,
      points: { min: 100, max: 500 },
      tiebreakEligible: true,
      files: [],
    })

    // Create users who solve the challenge
    for (let i = 0; i < 3; i++) {
      const user = await registerUser(testId(`IntUser${i}`))
      users.push(user)

      const submitRes = await submitFlag(user, challengeId, flag)
      assertAllSuccess(submitRes)
    }

    await refreshLeaderboard()
  })

  afterAll(async () => {
    await cleanupChallenge(challengeId)
    for (const user of users) {
      await cleanupUser(user)
    }
    await cleanupUser(admin)
  })

  test('ctftime leaderboard returns consistent data', async () => {
    await refreshLeaderboard()
    const res = await allAs(admin, '/api/v1/integrations/ctftime/leaderboard')

    assertAllSuccess(res)
    assertSame(res)
  }, 10_000)

  test('ctftime leaderboard has standings', async () => {
    const res = await allAs(admin, '/api/v1/integrations/ctftime/leaderboard')

    for (const r of Object.values(res)) {
      const body = r.body as {
        standings: { team: string; score: number }[]
      }
      expect(Array.isArray(body.standings)).toBe(true)
      expect(body.standings.length).toBeGreaterThan(0)
    }
  })
})
