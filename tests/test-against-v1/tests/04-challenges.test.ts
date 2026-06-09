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
  snapshotLeaderboard,
  submitFlag,
  testId,
  waitUntilSameWith,
  type TestUser,
} from '../lib/harness'

describe('Challenges - Get Challenges Authenticated', () => {
  let user: TestUser
  let admin: TestUser
  const challengeId = testId('challs-test')

  beforeAll(async () => {
    admin = await registerUser(testId('ChallsAdmin'))
    await makeAdmin(admin)

    user = await registerUser(testId('ChallsUser'))

    await createChallenge(admin, challengeId, {
      name: 'Test Challenge',
      description: 'A test challenge',
      category: 'test',
      author: 'Test',
      flag: 'flag{test}',
      points: { min: 100, max: 500 },
      tiebreakEligible: true,
      files: [],
    })

    await refreshLeaderboard()
  })

  afterAll(async () => {
    await cleanupChallenge(challengeId)
    await cleanupUser(user)
    await cleanupUser(admin)
  })

  test('GET /api/v1/challs with valid auth returns challenges', async () => {
    const res = await waitUntilSameWith(() => allAs(user, '/api/v1/challs'))

    assertAllSuccess(res)
    assertAllKind(res, 'goodChallenges')
    assertSame(res)
  }, 20_000)

  test('challenges list includes test challenge', async () => {
    const res = await allAs(user, '/api/v1/challs')

    for (const r of Object.values(res)) {
      const body = r.body as {
        data: { id: string; name: string; category: string }[]
      }
      const found = body.data.find(c => c.id === challengeId)
      expect(found).toBeDefined()
      expect(found?.name).toBe('Test Challenge')
      expect(found?.category).toBe('test')
    }
  })
})

describe('Challenges - Get Challenge Solves', () => {
  test('GET /api/v1/challs/:id/solves for nonexistent challenge returns badChallenge', async () => {
    const res = await all(
      '/api/v1/challs/some-challenge/solves?limit=10&offset=0'
    )

    // v1 has typo: "could not be not found" vs new: "could not be found"
    assertSameKind(res)
    assertAllKind(res, 'badChallenge')
  })
})

describe('Challenges - Get Challenge Solves Authenticated', () => {
  let user: TestUser
  let solver: TestUser
  let admin: TestUser
  const challengeId = testId('solves-test')
  const flag = 'flag{solves-test}'

  beforeAll(async () => {
    admin = await registerUser(testId('SolvesAdmin'))
    await makeAdmin(admin)

    user = await registerUser(testId('SolvesUser'))
    solver = await registerUser(testId('Solver'))

    await createChallenge(admin, challengeId, {
      name: 'Solves Test Challenge',
      description: 'Test',
      category: 'test',
      author: 'Test',
      flag,
      points: { min: 100, max: 500 },
      tiebreakEligible: true,
      files: [],
    })

    const lbSnapshot = await snapshotLeaderboard()

    const submitRes = await submitFlag(solver, challengeId, flag)
    assertAllSuccess(submitRes)

    await refreshLeaderboard(lbSnapshot)
  })

  afterAll(async () => {
    await cleanupChallenge(challengeId)
    await cleanupUser(user)
    await cleanupUser(solver)
    await cleanupUser(admin)
  })

  test('GET /api/v1/challs/:id/solves returns solves list', async () => {
    const res = await allAs(
      user,
      `/api/v1/challs/${challengeId}/solves?limit=10&offset=0`
    )

    assertAllSuccess(res)
    assertAllKind(res, 'goodChallengeSolves')
    assertSame(res, ['id', 'userId', 'createdAt'])
  })

  test('solves list includes solver', async () => {
    const res = await allAs(
      user,
      `/api/v1/challs/${challengeId}/solves?limit=10&offset=0`
    )

    for (const r of Object.values(res)) {
      const body = r.body as {
        data: { solves: { userName: string }[] }
      }
      const found = body.data.solves.find(s => s.userName === solver.name)
      expect(found).toBeDefined()
    }
  })

  test('GET /api/v1/challs/:id/solves with offset returns consistent results', async () => {
    const res = await allAs(
      user,
      `/api/v1/challs/${challengeId}/solves?limit=10&offset=1`
    )

    assertAllSuccess(res)
    assertAllKind(res, 'goodChallengeSolves')
    assertSame(res, ['id', 'userId'])
  })
})

describe('Challenges - Submit Flag', () => {
  test('POST /api/v1/challs/:id/submit without auth returns badToken', async () => {
    const res = await all('/api/v1/challs/some-challenge/submit', {
      method: 'POST',
      body: { flag: 'flag{test}' },
    })

    assertSame(res)
    assertAllKind(res, 'badToken')
  })

  test('POST /api/v1/challs/:id/submit with invalid auth returns badToken', async () => {
    const res = await all('/api/v1/challs/some-challenge/submit', {
      method: 'POST',
      body: { flag: 'flag{test}' },
      headers: { Authorization: 'Bearer invalid-token' },
    })

    assertSame(res)
    assertAllKind(res, 'badToken')
  })
})

describe('Challenges - Submit Flag Flow', () => {
  let user: TestUser
  let admin: TestUser
  const challengeId = testId('submit-test')
  const flag = 'flag{submit-test}'

  beforeAll(async () => {
    admin = await registerUser(testId('SubmitAdmin'))
    await makeAdmin(admin)

    user = await registerUser(testId('SubmitUser'))

    await createChallenge(admin, challengeId, {
      name: 'Submit Test Challenge',
      description: 'Test',
      category: 'test',
      author: 'Test',
      flag,
      points: { min: 100, max: 500 },
      tiebreakEligible: true,
      files: [],
    })
  })

  afterAll(async () => {
    await cleanupChallenge(challengeId)
    await cleanupUser(user)
    await cleanupUser(admin)
  })

  test('submitting wrong flag returns badFlag', async () => {
    const res = await submitFlag(user, challengeId, 'flag{wrong}')

    assertAllKind(res, 'badFlag')
    assertSame(res)
  })

  test('submitting correct flag returns goodFlag', async () => {
    const res = await submitFlag(user, challengeId, flag)

    assertAllSuccess(res)
    assertAllKind(res, 'goodFlag')
    assertSame(res)
  })

  test('submitting same flag again returns badAlreadySolvedChallenge', async () => {
    const res = await submitFlag(user, challengeId, flag)

    assertAllKind(res, 'badAlreadySolvedChallenge')
    assertSame(res)
  })

  test('submitting to nonexistent challenge returns badChallenge', async () => {
    const res = await submitFlag(user, 'nonexistent-challenge', 'flag{test}')

    // v1 has typo: "could not be not found" vs new: "could not be found"
    assertSameKind(res)
    assertAllKind(res, 'badChallenge')
  })
})
