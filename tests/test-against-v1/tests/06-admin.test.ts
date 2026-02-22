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

    assertSame(res)
    assertAllKind(res, 'badToken')
  })

  test('GET /api/v1/admin/challs with invalid auth returns badToken', async () => {
    const res = await all('/api/v1/admin/challs', {
      headers: { Authorization: 'Bearer invalid-token' },
    })

    assertSame(res)
    assertAllKind(res, 'badToken')
  })
})

describe('Admin - Get Single Admin Challenge', () => {
  test('GET /api/v1/admin/challs/:id without auth returns badToken', async () => {
    const res = await all('/api/v1/admin/challs/some-challenge-id')

    assertSame(res)
    assertAllKind(res, 'badToken')
  })

  test('GET /api/v1/admin/challs/:id with invalid auth returns badToken', async () => {
    const res = await all('/api/v1/admin/challs/some-challenge-id', {
      headers: { Authorization: 'Bearer invalid-token' },
    })

    assertSame(res)
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

    assertSame(res)
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

    assertSame(res)
    assertAllKind(res, 'badToken')
  })
})

describe('Admin - Delete Challenge', () => {
  test('DELETE /api/v1/admin/challs/:id without auth returns badToken', async () => {
    const res = await all('/api/v1/admin/challs/some-challenge-id', {
      method: 'DELETE',
    })

    assertSame(res)
    assertAllKind(res, 'badToken')
  })

  test('DELETE /api/v1/admin/challs/:id with invalid auth returns badToken', async () => {
    const res = await all('/api/v1/admin/challs/some-challenge-id', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer invalid-token' },
    })

    assertSame(res)
    assertAllKind(res, 'badToken')
  })
})

describe('Admin - Upload Files', () => {
  // v1 validates body first (badBody), new validates auth first (badToken).
  test('POST /api/v1/admin/upload without auth returns error', async () => {
    const res = await all('/api/v1/admin/upload', {
      method: 'POST',
      body: {},
    })

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

    for (const r of Object.values(res)) {
      expect(r.status).toBeGreaterThanOrEqual(400)
    }
  })

  test('POST /api/v1/admin/upload with valid admin auth and empty files returns same response', async () => {
    const admin = await registerUser(testId('UploadAdmin'))
    await makeAdmin(admin)

    try {
      const res = await allAs(admin, '/api/v1/admin/upload', {
        method: 'POST',
        body: { files: [] },
      })

      assertSame(res)
    } finally {
      await cleanupUser(admin)
    }
  })
})

describe('Admin - Query Uploads', () => {
  test('POST /api/v1/admin/upload/query without auth returns badToken', async () => {
    const res = await all('/api/v1/admin/upload/query', {
      method: 'POST',
      body: { uploads: [] },
    })

    assertSame(res)
    assertAllKind(res, 'badToken')
  })

  test('POST /api/v1/admin/upload/query with invalid auth returns badToken', async () => {
    const res = await all('/api/v1/admin/upload/query', {
      method: 'POST',
      body: { uploads: [] },
      headers: { Authorization: 'Bearer invalid-token' },
    })

    assertSame(res)
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

    assertSame(res)
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
      tiebreakEligible: true,
      files: [],
    })

    assertAllSuccess(res)
    assertAllKind(res, 'goodChallengeUpdate')
    assertSame(res)
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
          tiebreakEligible: true,
          files: [],
        },
      },
    })

    assertAllSuccess(res)
    assertAllKind(res, 'goodChallengeUpdate')
    assertSame(res)
  })

  test('admin can delete challenge', async () => {
    const res = await deleteChallenge(admin, challengeId)

    assertAllSuccess(res)
    assertAllKind(res, 'goodChallengeDelete')
    assertSame(res)
  })

  test('deleted challenge is no longer accessible', async () => {
    const res = await allAs(admin, `/api/v1/admin/challs/${challengeId}`)

    // v1 has typo: "could not be not found" vs new: "could not be found"
    assertSameKind(res)
    assertAllKind(res, 'badChallenge')
  })
})
