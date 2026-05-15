import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  all,
  allAs,
  assertAllKind,
  assertAllSuccess,
  assertSame,
  assertSameKind,
  awaitAllLeaderboard,
  cleanupChallenge,
  cleanupUser,
  createChallenge,
  makeAdmin,
  refreshLeaderboard,
  registerUser,
  snapshotLeaderboard,
  submitFlag,
  testId,
  type TestUser,
} from '../lib/harness'

describe('Leaderboard - Get Leaderboard', () => {
  test('GET /api/v1/leaderboard/now returns same response', async () => {
    const res = await all('/api/v1/leaderboard/now?limit=10&offset=0')

    assertAllSuccess(res)
    assertSame(res)
  })

  test('GET /api/v1/leaderboard/now with pagination returns same response', async () => {
    const res = await all('/api/v1/leaderboard/now?limit=5&offset=0')

    assertAllSuccess(res)
    assertSame(res)
  })

  test('GET /api/v1/leaderboard/now with division filter returns same response', async () => {
    const res = await all(
      '/api/v1/leaderboard/now?limit=10&offset=0&division=open'
    )

    assertAllSuccess(res)
    assertSame(res)
  })

  test('GET /api/v1/leaderboard/now with excessive limit returns error', async () => {
    const res = await all('/api/v1/leaderboard/now?limit=1000&offset=0')

    assertSameKind(res)
    for (const r of Object.values(res)) {
      expect(r.status).toBeGreaterThanOrEqual(400)
    }
  })

  test('leaderboard has expected structure', async () => {
    const res = await all('/api/v1/leaderboard/now?limit=10&offset=0')

    for (const r of Object.values(res)) {
      expect(r.status).toBe(200)
      const body = r.body as {
        kind: string
        data: {
          leaderboard: unknown[]
          total: number
        }
      }
      expect(body.kind).toBe('goodLeaderboard')
      expect(Array.isArray(body.data.leaderboard)).toBe(true)
      expect(typeof body.data.total).toBe('number')
    }
  })
})

describe('Leaderboard - Get Leaderboard Graph', () => {
  test('GET /api/v1/leaderboard/graph returns same response', async () => {
    const res = await all('/api/v1/leaderboard/graph?limit=10')

    assertAllSuccess(res)
    assertSame(res)
  })

  test('GET /api/v1/leaderboard/graph with division filter returns same response', async () => {
    const res = await all('/api/v1/leaderboard/graph?limit=10&division=open')

    assertAllSuccess(res)
    assertSame(res)
  })

  test('GET /api/v1/leaderboard/graph with excessive limit returns error', async () => {
    const res = await all('/api/v1/leaderboard/graph?limit=1000')

    assertSameKind(res)
    for (const r of Object.values(res)) {
      expect(r.status).toBeGreaterThanOrEqual(400)
    }
  })

  test('leaderboard graph has expected structure', async () => {
    const res = await all('/api/v1/leaderboard/graph?limit=10')

    for (const r of Object.values(res)) {
      expect(r.status).toBe(200)
      const body = r.body as {
        kind: string
        data: {
          graph: unknown[]
        }
      }
      expect(body.kind).toBe('goodLeaderboardGraph')
      expect(Array.isArray(body.data.graph)).toBe(true)
    }
  })
})

describe('Leaderboard - With Test Data', () => {
  let admin: TestUser
  let solvers: TestUser[] = []
  const challengeId = testId('lb-chall')
  const flag = 'flag{leaderboard-test}'

  beforeAll(async () => {
    admin = await registerUser(testId('LBAdmin'))
    await makeAdmin(admin)

    const challRes = await createChallenge(admin, challengeId, {
      name: 'Leaderboard Test Challenge',
      description: 'Test challenge for leaderboard',
      category: 'test',
      author: 'Test',
      flag,
      points: { min: 100, max: 500 },
      tiebreakEligible: true,
      files: [],
    })
    assertAllSuccess(challRes)

    for (let i = 0; i < 3; i++) {
      const user = await registerUser(testId(`LBSolver${i}`))
      solvers.push(user)
    }

    const lbSnapshot = await snapshotLeaderboard()
    for (let i = 0; i < solvers.length; i++) {
      const submitRes = await submitFlag(solvers[i]!, challengeId, flag)
      assertAllSuccess(submitRes)
      assertAllKind(submitRes, 'goodFlag')
    }

    await refreshLeaderboard(lbSnapshot)
  }, 30_000)

  afterAll(async () => {
    await cleanupChallenge(challengeId)
    for (const user of solvers) {
      await cleanupUser(user)
    }
    await cleanupUser(admin)
  }, 30_000)

  test('leaderboard includes solvers with scores', async () => {
    // Wait for both instances to reflect the solves before comparing -
    // refreshLeaderboard's snapshot-diff in beforeAll can return early.
    const res = await awaitAllLeaderboard(entries =>
      solvers.every(s => entries.some(e => e.name === s.name && e.score > 0))
    )

    assertAllSuccess(res)
    assertSame(res, ['id'])

    for (const r of Object.values(res)) {
      const body = r.body as {
        data: { leaderboard: { name: string; score: number }[] }
      }
      const hasSolver = body.data.leaderboard.some(
        entry => solvers.some(s => entry.name === s.name) && entry.score > 0
      )
      expect(hasSolver).toBe(true)
    }
  })
})
