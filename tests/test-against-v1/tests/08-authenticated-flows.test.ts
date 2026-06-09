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
  snapshotLeaderboard,
  submitFlag,
  testId,
  waitUntilSame,
  waitUntilSameWith,
  type AllResponses,
  type TestUser,
} from '../lib/harness'

const fetchLeaderboardPages = () =>
  Promise.all([
    all('/api/v1/leaderboard/now?limit=3&offset=0'),
    all('/api/v1/leaderboard/now?limit=3&offset=3'),
  ] as const)

const getLeaderboardTotal = (
  res: AllResponses,
  name: string
): number | undefined => {
  const body = res[name]?.body as { data?: { total?: unknown } } | undefined
  return typeof body?.data?.total === 'number' ? body.data.total : undefined
}

const allSucceeded = (res: AllResponses): boolean =>
  Object.values(res).every(r => r.status >= 200 && r.status < 300)

const leaderboardTotalsMatch = (
  res1: AllResponses,
  res2: AllResponses
): boolean =>
  allSucceeded(res1) &&
  allSucceeded(res2) &&
  Object.keys(res1).every(name => {
    const total1 = getLeaderboardTotal(res1, name)
    return total1 !== undefined && total1 === getLeaderboardTotal(res2, name)
  })

const formatLeaderboardTotals = (
  res1: AllResponses,
  res2: AllResponses
): string =>
  Object.keys(res1)
    .map(
      name =>
        `${name}: offset0=${getLeaderboardTotal(res1, name)} offset3=${getLeaderboardTotal(res2, name)}`
    )
    .join(', ')

const stableLeaderboardPages = async (
  timeout = 20_000
): Promise<readonly [AllResponses, AllResponses]> => {
  const start = Date.now()
  let lastTotals = 'no responses'

  while (Date.now() - start < timeout) {
    const pages = await fetchLeaderboardPages()
    if (leaderboardTotalsMatch(...pages)) {
      return pages
    }

    lastTotals = formatLeaderboardTotals(...pages)
    await Bun.sleep(250)
  }

  throw new Error(`Leaderboard totals did not settle: ${lastTotals}`)
}

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
  }, 30_000)

  afterAll(async () => {
    await cleanupChallenge(challengeId)
    await cleanupUser(solver1)
    await cleanupUser(solver2)
    await cleanupUser(admin)
  }, 30_000)

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
  }, 20_000)

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

    await Bun.sleep(5000)

    // Wait until both solvers have a positive cached score in profile.
    const start = Date.now()
    while (Date.now() - start < 10_000) {
      const [s1Res, s2Res] = await Promise.all([
        allAsCallback(
          solver1,
          instance => `/api/v1/users/${solver1.ids[instance.name]}`
        ),
        allAsCallback(
          solver2,
          instance => `/api/v1/users/${solver2.ids[instance.name]}`
        ),
      ])

      const allPositive = Object.keys(s1Res).every(name => {
        const s1Body = s1Res[name]?.body as { data: { score: number } }
        const s2Body = s2Res[name]?.body as { data: { score: number } }
        return s1Body.data.score > 0 && s2Body.data.score > 0
      })
      if (allPositive) return
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw new Error(
      'Profiles did not reflect both solver scores within timeout'
    )
  }, 20_000)

  test('challenge solves list shows both solvers', async () => {
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
    const [s1Res, s2Res] = await Promise.all([
      allAsCallback(
        solver1,
        instance => `/api/v1/users/${solver1.ids[instance.name]}`
      ),
      allAsCallback(
        solver2,
        instance => `/api/v1/users/${solver2.ids[instance.name]}`
      ),
    ])

    for (const name of Object.keys(s1Res)) {
      const s1Body = s1Res[name]?.body as { data: { score: number } }
      const s2Body = s2Res[name]?.body as { data: { score: number } }
      expect(s1Body.data.score).toBeGreaterThan(0)
      expect(s2Body.data.score).toBeGreaterThan(0)
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

    const lbSnapshot = await snapshotLeaderboard()

    for (const chall of challenges) {
      await submitFlag(userA, chall.id, chall.flag)
    }

    const firstChall = challenges[0]!
    await submitFlag(userB, firstChall.id, firstChall.flag)

    await refreshLeaderboard(lbSnapshot)
  }, 30_000)

  afterAll(async () => {
    for (const chall of challenges) {
      await cleanupChallenge(chall.id)
    }
    await cleanupUser(userA)
    await cleanupUser(userB)
    await cleanupUser(admin)
  }, 30_000)

  test('user profiles return consistent data', async () => {
    for (const user of [userA, userB]) {
      const res = await waitUntilSameWith(
        () =>
          allAsCallback(
            user,
            instance => `/api/v1/users/${user.ids[instance.name]}`
          ),
        ['createdAt']
      )
      assertAllSuccess(res)
      assertAllKind(res, 'goodUserData')
      assertSame(res, ['createdAt'])
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
    const res = await waitUntilSame(
      '/api/v1/leaderboard/now?limit=100&offset=0',
      ['id']
    )

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

    await refreshLeaderboard()
  }, 30_000)

  afterAll(async () => {
    for (const user of users) {
      await cleanupUser(user)
    }
  }, 30_000)

  test('pagination returns consistent results', async () => {
    const res1 = await waitUntilSame(
      '/api/v1/leaderboard/now?limit=3&offset=0',
      ['id']
    )
    const res2 = await waitUntilSame(
      '/api/v1/leaderboard/now?limit=3&offset=3',
      ['id']
    )

    assertAllSuccess(res1)
    assertAllSuccess(res2)
    assertSame(res1, ['id'])
    assertSame(res2, ['id'])
  })

  test('total count is consistent across pages', async () => {
    const [res1, res2] = await stableLeaderboardPages()

    for (const name of Object.keys(res1)) {
      const body1 = res1[name]?.body as { data: { total: number } }
      const body2 = res2[name]?.body as { data: { total: number } }

      expect(body1.data.total).toBe(body2.data.total)
    }
  }, 30_000)
})
