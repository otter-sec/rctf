import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  all,
  allAs,
  allAsCallback,
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

describe('Authenticated Flows - Setup', () => {
  let admin: TestUser
  let regular: TestUser

  beforeAll(async () => {
    admin = await registerUser(testId('FlowAdmin'))
    await makeAdmin(admin)

    regular = await registerUser(testId('FlowRegular'))
  })

  afterAll(async () => {
    await cleanupUser(admin)
    await cleanupUser(regular)
  })

  test('admin and regular users are created', async () => {
    expect(Object.keys(admin.tokens).length).toBeGreaterThan(0)
    expect(Object.keys(regular.tokens).length).toBeGreaterThan(0)
  })

  test('admin can access admin endpoints', async () => {
    const res = await allAs(admin, '/api/v1/admin/challs')

    assertAllSuccess(res)
    assertAllKind(res, 'goodAdminChallenges')
  })

  test('regular user cannot access admin endpoints', async () => {
    const res = await allAs(regular, '/api/v1/admin/challs')

    assertSame(res)
    assertAllKind(res, 'badPerms')
  })
})

describe('Authenticated Flows - Challenge Lifecycle', () => {
  let admin: TestUser
  let solver1: TestUser
  let solver2: TestUser
  const challengeId = testId('lifecycle-chall')
  const flag = 'flag{lifecycle}'

  beforeAll(async () => {
    admin = await registerUser(testId('LifecycleAdmin'))
    await makeAdmin(admin)

    solver1 = await registerUser(testId('Solver1'))
    solver2 = await registerUser(testId('Solver2'))
  })

  afterAll(async () => {
    await cleanupChallenge(challengeId)
    await cleanupUser(solver1)
    await cleanupUser(solver2)
    await cleanupUser(admin)
  })

  test('admin creates challenge', async () => {
    const res = await createChallenge(admin, challengeId, {
      name: 'Lifecycle Challenge',
      description: 'Test the full lifecycle',
      category: 'test',
      author: 'Test',
      flag,
      points: { min: 100, max: 500 },
      tiebreakEligible: true,
      files: [],
    })

    assertAllSuccess(res)
    assertAllKind(res, 'goodChallengeUpdate')
    assertSame(res)
  })

  test('challenge appears in challenges list', async () => {
    await refreshLeaderboard()
    const res = await allAs(solver1, '/api/v1/challs')
    assertAllSuccess(res)

    for (const r of Object.values(res)) {
      const body = r.body as { data: { id: string }[] }
      const found = body.data.find(c => c.id === challengeId)
      expect(found).toBeDefined()
    }
  }, 10_000)

  test('solver1 submits correct flag', async () => {
    const res = await submitFlag(solver1, challengeId, flag)

    assertAllSuccess(res)
    assertAllKind(res, 'goodFlag')
    assertSame(res)
  })

  test('solver1 cannot submit again', async () => {
    const res = await submitFlag(solver1, challengeId, flag)

    assertSameKind(res)
    assertAllKind(res, 'badAlreadySolvedChallenge')
  })

  test('solver2 submits correct flag', async () => {
    const res = await submitFlag(solver2, challengeId, flag)

    assertAllSuccess(res)
    assertAllKind(res, 'goodFlag')
  })

  test('challenge solves list shows both solvers', async () => {
    await refreshLeaderboard()

    const res = await allAs(
      solver1,
      `/api/v1/challs/${challengeId}/solves?limit=10&offset=0`
    )

    assertAllSuccess(res)
    assertSame(res, ['id', 'createdAt', 'userId'])

    for (const r of Object.values(res)) {
      const body = r.body as { data: { solves: { name: string }[] } }
      expect(body.data.solves.length).toBe(2)
    }
  })

  test('leaderboard reflects scores', async () => {
    const res = await all('/api/v1/leaderboard/now?limit=100&offset=0')

    assertAllSuccess(res)
    assertSame(res, ['id'])

    for (const r of Object.values(res)) {
      const body = r.body as {
        data: { leaderboard: { name: string; score: number }[] }
      }
      const s1 = body.data.leaderboard.find(e => e.name === solver1.name)
      const s2 = body.data.leaderboard.find(e => e.name === solver2.name)

      expect(s1).toBeDefined()
      expect(s2).toBeDefined()
      expect(s1!.score).toBeGreaterThan(0)
      expect(s2!.score).toBeGreaterThan(0)
    }
  })
})

describe('Authenticated Flows - User Profile Consistency', () => {
  let admin: TestUser
  let userA: TestUser
  let userB: TestUser
  const challenges: { id: string; flag: string }[] = []

  beforeAll(async () => {
    admin = await registerUser(testId('ProfAdmin'))
    await makeAdmin(admin)

    userA = await registerUser(testId('ProfileA'))
    userB = await registerUser(testId('ProfileB'))

    for (let i = 0; i < 2; i++) {
      const id = testId(`prof-chall-${i}`)
      const flag = `flag{profile-${i}}`
      challenges.push({ id, flag })

      await createChallenge(admin, id, {
        name: `Profile Challenge ${i}`,
        description: 'Test',
        category: 'test',
        author: 'Test',
        flag,
        points: { min: 100, max: 500 },
        tiebreakEligible: true,
        files: [],
      })
    }

    for (const chall of challenges) {
      await submitFlag(userA, chall.id, chall.flag)
    }

    const firstChall = challenges[0]!
    await submitFlag(userB, firstChall.id, firstChall.flag)

    await refreshLeaderboard()
  })

  afterAll(async () => {
    for (const chall of challenges) {
      await cleanupChallenge(chall.id)
    }
    await cleanupUser(userA)
    await cleanupUser(userB)
    await cleanupUser(admin)
  })

  test('user profiles return consistent data', async () => {
    for (const user of [userA, userB]) {
      const res = await allAsCallback(
        user,
        instance => `/api/v1/users/${user.ids[instance.name]}`
      )
      assertAllSuccess(res)
      assertAllKind(res, 'goodUserData')
      assertSame(res, ['ctftimeId'])
    }
  })

  test('userA has more solves than userB', async () => {
    const resA = await allAsCallback(
      userA,
      instance => `/api/v1/users/${userA.ids[instance.name]}`
    )
    const resB = await allAsCallback(
      userB,
      instance => `/api/v1/users/${userB.ids[instance.name]}`
    )

    for (const [name, r] of Object.entries(resA)) {
      const bodyA = r.body as { data: { solves: unknown[] } }
      const bodyB = (resB[name]?.body as { data: { solves: unknown[] } }) ?? {
        data: { solves: [] },
      }

      expect(bodyA.data.solves.length).toBeGreaterThan(bodyB.data.solves.length)
    }
  })

  test('leaderboard order reflects solve counts', async () => {
    const res = await all('/api/v1/leaderboard/now?limit=100&offset=0')

    assertAllSuccess(res)
    assertSame(res, ['id'])

    for (const r of Object.values(res)) {
      const body = r.body as {
        data: { leaderboard: { name: string; score: number }[] }
      }
      const scoreA =
        body.data.leaderboard.find(e => e.name === userA.name)?.score ?? 0
      const scoreB =
        body.data.leaderboard.find(e => e.name === userB.name)?.score ?? 0

      expect(scoreA).toBeGreaterThan(scoreB)
    }
  })
})

describe('Authenticated Flows - Rate Limiting', () => {
  test('rapid requests return consistent responses', async () => {
    const promises = Array(10)
      .fill(null)
      .map(() => all('/api/v1/leaderboard/now?limit=10&offset=0'))

    const results = await Promise.all(promises)

    for (const res of results) {
      assertSameKind(res)
    }
  })
})

describe('Authenticated Flows - Pagination', () => {
  let users: TestUser[] = []

  beforeAll(async () => {
    for (let i = 0; i < 5; i++) {
      const user = await registerUser(testId(`PagUser${i}`))
      users.push(user)
    }
  })

  afterAll(async () => {
    for (const user of users) {
      await cleanupUser(user)
    }
  })

  test('pagination returns consistent results', async () => {
    const res1 = await all('/api/v1/leaderboard/now?limit=3&offset=0')
    const res2 = await all('/api/v1/leaderboard/now?limit=3&offset=3')

    assertAllSuccess(res1)
    assertAllSuccess(res2)
    assertSame(res1, ['id'])
    assertSame(res2, ['id'])
  })

  test('total count is consistent across pages', async () => {
    const res1 = await all('/api/v1/leaderboard/now?limit=3&offset=0')
    const res2 = await all('/api/v1/leaderboard/now?limit=3&offset=3')

    for (const name of Object.keys(res1)) {
      const body1 = res1[name]?.body as { data: { total: number } }
      const body2 = res2[name]?.body as { data: { total: number } }

      expect(body1.data.total).toBe(body2.data.total)
    }
  })
})
