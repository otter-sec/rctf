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
  deleteChallenge,
  makeAdmin,
  registerUser,
  testId,
  type TestUser,
} from '../lib/harness'

describe('Admin - Get Admin Challenges', () => {
  test('GET /api/v1/admin/challs without auth returns badToken', async () => {
    const res = await all('/api/v1/admin/challs')

    assertSameKind(res)
    assertAllKind(res, 'badToken')
  })

  test('GET /api/v1/admin/challs with invalid auth returns badToken', async () => {
    const res = await all('/api/v1/admin/challs', {
      headers: { Authorization: 'Bearer invalid-token' },
    })

    assertSameKind(res)
    assertAllKind(res, 'badToken')
  })
})

describe('Admin - Get Single Admin Challenge', () => {
  test('GET /api/v1/admin/challs/:id without auth returns badToken', async () => {
    const res = await all('/api/v1/admin/challs/some-challenge-id')

    assertSameKind(res)
    assertAllKind(res, 'badToken')
  })

  test('GET /api/v1/admin/challs/:id with invalid auth returns badToken', async () => {
    const res = await all('/api/v1/admin/challs/some-challenge-id', {
      headers: { Authorization: 'Bearer invalid-token' },
    })

    assertSameKind(res)
    assertAllKind(res, 'badToken')
  })
})

describe('Admin - Update Challenge', () => {
  test('PUT /api/v1/admin/challs/:id without auth returns badToken', async () => {
    const res = await all('/api/v1/admin/challs/some-challenge-id', {
      method: 'PUT',
      body: {
        data: {
          name: 'Test',
          description: 'Test',
          category: 'test',
          author: 'Test',
          flag: 'flag{test}',
          points: { min: 100, max: 500 },
        },
      },
    })

    assertSameKind(res)
    assertAllKind(res, 'badToken')
  })

  test('PUT /api/v1/admin/challs/:id with invalid auth returns badToken', async () => {
    const res = await all('/api/v1/admin/challs/some-challenge-id', {
      method: 'PUT',
      body: {
        data: {
          name: 'Test',
          description: 'Test',
          category: 'test',
          author: 'Test',
          flag: 'flag{test}',
          points: { min: 100, max: 500 },
        },
      },
      headers: { Authorization: 'Bearer invalid-token' },
    })

    assertSameKind(res)
    assertAllKind(res, 'badToken')
  })
})

describe('Admin - Delete Challenge', () => {
  test('DELETE /api/v1/admin/challs/:id without auth returns badToken', async () => {
    const res = await all('/api/v1/admin/challs/some-challenge-id', {
      method: 'DELETE',
    })

    assertSameKind(res)
    assertAllKind(res, 'badToken')
  })

  test('DELETE /api/v1/admin/challs/:id with invalid auth returns badToken', async () => {
    const res = await all('/api/v1/admin/challs/some-challenge-id', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer invalid-token' },
    })

    assertSameKind(res)
    assertAllKind(res, 'badToken')
  })
})

describe('Admin - Upload Files', () => {
  test('POST /api/v1/admin/upload without auth returns error', async () => {
    const res = await all('/api/v1/admin/upload', {
      method: 'POST',
      body: {},
    })

    // v1 validates body first (badBody), new validates auth first (badToken)
    for (const r of Object.values(res)) {
      expect(r.status).toBeGreaterThanOrEqual(400)
    }
  })

  test('POST /api/v1/admin/upload with invalid auth returns error', async () => {
    const res = await all('/api/v1/admin/upload', {
      method: 'POST',
      body: {},
      headers: { Authorization: 'Bearer invalid-token' },
    })

    // v1 validates body first (badBody), new validates auth first (badToken)
    for (const r of Object.values(res)) {
      expect(r.status).toBeGreaterThanOrEqual(400)
    }
  })
})

describe('Admin - Query Uploads', () => {
  test('POST /api/v1/admin/upload/query without auth returns badToken', async () => {
    const res = await all('/api/v1/admin/upload/query', {
      method: 'POST',
      body: { uploads: [] },
    })

    assertSameKind(res)
    assertAllKind(res, 'badToken')
  })

  test('POST /api/v1/admin/upload/query with invalid auth returns badToken', async () => {
    const res = await all('/api/v1/admin/upload/query', {
      method: 'POST',
      body: { uploads: [] },
      headers: { Authorization: 'Bearer invalid-token' },
    })

    assertSameKind(res)
    assertAllKind(res, 'badToken')
  })
})

describe('Admin - Permissions', () => {
  let regularUser: TestUser

  beforeAll(async () => {
    regularUser = await registerUser(testId('RegularUser'))
  })

  afterAll(async () => {
    await cleanupUser(regularUser)
  })

  test('regular user cannot access admin endpoints', async () => {
    const res = await allAs(regularUser, '/api/v1/admin/challs')

    assertSameKind(res)
    assertAllKind(res, 'badPerms')
  })
})

describe('Admin - Challenge CRUD Flow', () => {
  let admin: TestUser
  const challengeId = testId('admin-crud')

  beforeAll(async () => {
    admin = await registerUser(testId('CRUDAdmin'))
    await makeAdmin(admin)
  })

  afterAll(async () => {
    await cleanupChallenge(challengeId)
    await cleanupUser(admin)
  })

  test('admin can create challenge', async () => {
    const res = await createChallenge(admin, challengeId, {
      name: 'Admin CRUD Test',
      description: 'Test challenge for CRUD',
      category: 'test',
      author: 'Test',
      flag: 'flag{admin-crud}',
      points: { min: 100, max: 500 },
    })

    assertAllSuccess(res)
    assertAllKind(res, 'goodChallengeUpdate')
    assertSame(res, ['files', 'tiebreakEligible']) // we always return files and tiebreakEligible, v1 is not
  })

  test('admin can list challenges', async () => {
    const res = await allAs(admin, '/api/v1/admin/challs')

    assertAllSuccess(res)
    assertAllKind(res, 'goodAdminChallenges')
    assertSame(res)

    for (const r of Object.values(res)) {
      const body = r.body as { data: { id: string }[] }
      const found = body.data.find(c => c.id === challengeId)
      expect(found).toBeDefined()
    }
  })

  test('admin can get single challenge', async () => {
    const res = await allAs(admin, `/api/v1/admin/challs/${challengeId}`)

    assertAllSuccess(res)
    assertAllKind(res, 'goodAdminChallenge')
    assertSame(res)
  })

  test('admin can update challenge', async () => {
    const res = await allAs(admin, `/api/v1/admin/challs/${challengeId}`, {
      method: 'PUT',
      body: {
        data: {
          name: 'Updated Challenge',
          description: 'Updated description',
          category: 'test',
          author: 'Test',
          flag: 'flag{updated}',
          points: { min: 200, max: 600 },
        },
      },
    })

    assertAllSuccess(res)
    assertAllKind(res, 'goodChallengeUpdate')
    assertSame(res, ['files', 'tiebreakEligible']) // we always return files and tiebreakEligible, v1 is not
  })

  test('admin can delete challenge', async () => {
    const res = await deleteChallenge(admin, challengeId)

    assertAllSuccess(res)
    assertAllKind(res, 'goodChallengeDelete')
    assertSame(res)
  })

  test('deleted challenge is no longer accessible', async () => {
    const res = await allAs(admin, `/api/v1/admin/challs/${challengeId}`)

    assertSameKind(res)
    assertAllKind(res, 'badChallenge')
  })
})
