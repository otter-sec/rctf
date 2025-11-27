import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  all,
  allAs,
  allUserProfile,
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

describe('Users - Get User (Public)', () => {
  let user: TestUser

  beforeAll(async () => {
    user = await registerUser(testId('PublicUser'))
  })

  afterAll(async () => {
    await cleanupUser(user)
  })

  test('GET /api/v1/users/:id returns same response for existing user', async () => {
    // Each instance has different user IDs, so query each with its own ID
    const res = await allUserProfile(user)

    assertAllSuccess(res)
    assertAllKind(res, 'goodUserData')
    // ctftimeId may differ between instances
    assertSame(res, ['ctftimeId'])
  })

  test('GET /api/v1/users/:id returns badUnknownUser for non-existent user', async () => {
    const res = await all('/api/v1/users/nonexistent-user-id-12345')

    assertSameKind(res)
    assertAllKind(res, 'badUnknownUser')
  })

  test('user data has expected structure', async () => {
    const res = await allUserProfile(user)

    for (const r of Object.values(res)) {
      expect(r.status).toBe(200)
      const body = r.body as {
        kind: string
        data: {
          name: string
          division: string
          score: number
          solves: unknown[]
        }
      }
      expect(body.kind).toBe('goodUserData')
      expect(body.data.name).toBe(user.name)
      expect(body.data.division).toBe('open')
      expect(typeof body.data.score).toBe('number')
      expect(Array.isArray(body.data.solves)).toBe(true)
    }
  })
})

describe('Users - Get User Self (Authenticated)', () => {
  test('GET /api/v1/users/me without auth returns badToken', async () => {
    const res = await all('/api/v1/users/me')

    assertSameKind(res)
    assertAllKind(res, 'badToken')
  })

  test('GET /api/v1/users/me with invalid auth returns badToken', async () => {
    const res = await all('/api/v1/users/me', {
      headers: { Authorization: 'Bearer invalid-token' },
    })

    assertSameKind(res)
    assertAllKind(res, 'badToken')
  })
})

describe('Users - Get User Self Flow', () => {
  let user: TestUser

  beforeAll(async () => {
    user = await registerUser(testId('SelfUser'))
  })

  afterAll(async () => {
    await cleanupUser(user)
  })

  test('GET /api/v1/users/me with valid auth returns user data', async () => {
    const res = await allAs(user, '/api/v1/users/me')

    assertAllSuccess(res)
    assertAllKind(res, 'goodUserSelfData')
    assertSame(res, ['id', 'email', 'teamToken', 'ctftimeId'])
  })

  test('user self data includes name', async () => {
    const res = await allAs(user, '/api/v1/users/me')

    for (const r of Object.values(res)) {
      const body = r.body as { data: { name: string } }
      expect(body.data.name).toBe(user.name)
    }
  })
})

describe('Users - Update User (Authenticated)', () => {
  test('PATCH /api/v1/users/me without auth returns badToken', async () => {
    const res = await all('/api/v1/users/me', {
      method: 'PATCH',
      body: { name: 'NewName' },
    })

    assertSameKind(res)
    assertAllKind(res, 'badToken')
  })

  test('PATCH /api/v1/users/me with invalid auth returns badToken', async () => {
    const res = await all('/api/v1/users/me', {
      method: 'PATCH',
      body: { name: 'NewName' },
      headers: { Authorization: 'Bearer invalid-token' },
    })

    assertSameKind(res)
    assertAllKind(res, 'badToken')
  })
})

describe('Users - Members (Authenticated)', () => {
  test('GET /api/v1/users/me/members without auth returns badToken', async () => {
    const res = await all('/api/v1/users/me/members')

    assertSameKind(res)
    assertAllKind(res, 'badToken')
  })

  test('POST /api/v1/users/me/members without auth returns badToken', async () => {
    const res = await all('/api/v1/users/me/members', {
      method: 'POST',
      body: { email: 'test@example.com' },
    })

    assertSameKind(res)
    assertAllKind(res, 'badToken')
  })

  test('DELETE /api/v1/users/me/members/:id without auth returns badToken', async () => {
    const res = await all('/api/v1/users/me/members/some-member-id', {
      method: 'DELETE',
    })

    assertSameKind(res)
    assertAllKind(res, 'badToken')
  })
})

describe('Users - Email (Authenticated)', () => {
  test('PUT /api/v1/users/me/auth/email without auth returns badToken', async () => {
    const res = await all('/api/v1/users/me/auth/email', {
      method: 'PUT',
      body: { email: 'test@example.com' },
    })

    assertSameKind(res)
    assertAllKind(res, 'badToken')
  })

  test('DELETE /api/v1/users/me/auth/email without auth returns badToken', async () => {
    const res = await all('/api/v1/users/me/auth/email', {
      method: 'DELETE',
    })

    assertSameKind(res)
    assertAllKind(res, 'badToken')
  })
})

describe('Users - CTFtime (Authenticated)', () => {
  test('PUT /api/v1/users/me/auth/ctftime without auth returns badToken', async () => {
    const res = await all('/api/v1/users/me/auth/ctftime', {
      method: 'PUT',
      body: { ctftimeToken: 'fake-token' },
    })

    assertSameKind(res)
    assertAllKind(res, 'badToken')
  })

  test('DELETE /api/v1/users/me/auth/ctftime without auth returns badToken', async () => {
    const res = await all('/api/v1/users/me/auth/ctftime', {
      method: 'DELETE',
    })

    assertSameKind(res)
    assertAllKind(res, 'badToken')
  })
})

describe('Users - Profile With Solves', () => {
  let user: TestUser
  let admin: TestUser
  const challengeId = testId('profile-chall')
  const flag = 'flag{profile-test}'

  beforeAll(async () => {
    admin = await registerUser(testId('ProfileAdmin'))
    await makeAdmin(admin)

    user = await registerUser(testId('ProfileUser'))

    await createChallenge(admin, challengeId, {
      name: 'Profile Test Challenge',
      description: 'Test',
      category: 'test',
      author: 'Test',
      flag,
      points: { min: 100, max: 500 },
    })

    // User solves the challenge
    const submitRes = await submitFlag(user, challengeId, flag)
    assertAllSuccess(submitRes)

    await refreshLeaderboard()
  })

  afterAll(async () => {
    await cleanupChallenge(challengeId)
    await cleanupUser(user)
    await cleanupUser(admin)
  })

  test('user profile includes solve', async () => {
    const res = await allUserProfile(user)

    assertAllSuccess(res)
    assertAllKind(res, 'goodUserData')
    assertSame(res, ['createdAt'])

    for (const r of Object.values(res)) {
      const body = r.body as {
        data: { solves: { name: string }[] }
      }
      const found = body.data.solves.find(
        s => s.name === 'Profile Test Challenge'
      )
      expect(found).toBeDefined()
    }
  })

  test('user score is positive after solve', async () => {
    const res = await allUserProfile(user)

    for (const r of Object.values(res)) {
      const body = r.body as { data: { score: number } }
      expect(body.data.score).toBeGreaterThan(0)
    }
  })
})

describe('Users - Division Filtering', () => {
  const users: TestUser[] = []

  beforeAll(async () => {
    for (let i = 0; i < 2; i++) {
      const user = await registerUser(testId(`DivUser${i}`))
      users.push(user)
    }
  })

  afterAll(async () => {
    for (const user of users) {
      await cleanupUser(user)
    }
  })

  test('all users in same division are retrievable', async () => {
    for (const u of users) {
      const res = await allUserProfile(u)

      assertAllSuccess(res)
      assertAllKind(res, 'goodUserData')
      assertSame(res, ['ctftimeId'])

      for (const r of Object.values(res)) {
        const body = r.body as { data: { division: string } }
        expect(body.data.division).toBe('open')
      }
    }
  })
})
