import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { config } from '@rctf/config'
import {
  BadKnownEmail,
  BadTooManyMembers,
  GoodMemberCreate,
  GoodMemberData,
  GoodMemberDelete,
} from '@rctf/types'
import type { Hono } from 'hono'
import { getApp, request } from '../../app'
import {
  expectResponse,
  generateAuthToken,
  generateRealTestUser,
} from '../../util'

let app: Hono<any>
let oldUserMembers: typeof config.userMembers
let oldMaxMembers: typeof config.maxMembers

// Track users and cleanups
const createdUserCleanups: Array<() => Promise<void>> = []

beforeAll(async () => {
  app = await getApp()
  oldUserMembers = config.userMembers
  oldMaxMembers = config.maxMembers
  // Enable userMembers for testing
  config.userMembers = true
})

afterAll(async () => {
  config.userMembers = oldUserMembers
  config.maxMembers = oldMaxMembers
  for (const cleanup of createdUserCleanups) {
    await cleanup()
  }
})

describe('members service', () => {
  describe('createMember', () => {
    test('succeeds with goodMemberCreate', async () => {
      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      const authToken = await generateAuthToken(user.id)
      const memberEmail = `member-${crypto.randomUUID()}@test.com`

      const res = await request(app, '/api/v1/users/me/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ email: memberEmail }),
      })

      const body = await expectResponse(res, GoodMemberCreate)
      expect(body.data.email).toBe(memberEmail)
      expect(body.data.userid).toBe(user.id)
      expect(typeof body.data.id).toBe('string')
    })

    test('fails with badKnownEmail when email already exists', async () => {
      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      const authToken = await generateAuthToken(user.id)
      const memberEmail = `duplicate-${crypto.randomUUID()}@test.com`

      // Create first member
      let res = await request(app, '/api/v1/users/me/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ email: memberEmail }),
      })

      await expectResponse(res, GoodMemberCreate)

      // Try to create another member with the same email
      res = await request(app, '/api/v1/users/me/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ email: memberEmail }),
      })

      await expectResponse(res, BadKnownEmail)
    })

    test('allows same email on different teams', async () => {
      const { user: user1, cleanup: cleanup1 } = await generateRealTestUser()
      createdUserCleanups.push(cleanup1)
      const { user: user2, cleanup: cleanup2 } = await generateRealTestUser()
      createdUserCleanups.push(cleanup2)

      const memberEmail = `shared-${crypto.randomUUID()}@test.com`

      const res1 = await request(app, '/api/v1/users/me/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await generateAuthToken(user1.id)}`,
        },
        body: JSON.stringify({ email: memberEmail }),
      })
      await expectResponse(res1, GoodMemberCreate)

      const res2 = await request(app, '/api/v1/users/me/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await generateAuthToken(user2.id)}`,
        },
        body: JSON.stringify({ email: memberEmail }),
      })
      await expectResponse(res2, GoodMemberCreate)
    })

    test('fails with badTooManyMembers when limit is reached', async () => {
      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      const authToken = await generateAuthToken(user.id)
      config.maxMembers = 2

      for (let i = 0; i < 2; i++) {
        const res = await request(app, '/api/v1/users/me/members', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            email: `limit-${i}-${crypto.randomUUID()}@test.com`,
          }),
        })
        await expectResponse(res, GoodMemberCreate)
      }

      const res = await request(app, '/api/v1/users/me/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          email: `limit-overflow-${crypto.randomUUID()}@test.com`,
        }),
      })
      await expectResponse(res, BadTooManyMembers)

      config.maxMembers = oldMaxMembers
    })

    test('allows creating member after deleting when at limit', async () => {
      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      const authToken = await generateAuthToken(user.id)
      config.maxMembers = 1

      const createRes = await request(app, '/api/v1/users/me/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          email: `recycle-${crypto.randomUUID()}@test.com`,
        }),
      })
      const body = await expectResponse(createRes, GoodMemberCreate)

      await request(app, `/api/v1/users/me/members/${body.data.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      })

      const res = await request(app, '/api/v1/users/me/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          email: `recycle-new-${crypto.randomUUID()}@test.com`,
        }),
      })
      await expectResponse(res, GoodMemberCreate)

      config.maxMembers = oldMaxMembers
    })

    test('member limit is per-team, not global', async () => {
      const { user: user1, cleanup: cleanup1 } = await generateRealTestUser()
      createdUserCleanups.push(cleanup1)
      const { user: user2, cleanup: cleanup2 } = await generateRealTestUser()
      createdUserCleanups.push(cleanup2)

      config.maxMembers = 1

      // User1 adds a member (at limit)
      const res1 = await request(app, '/api/v1/users/me/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await generateAuthToken(user1.id)}`,
        },
        body: JSON.stringify({
          email: `per-team-1-${crypto.randomUUID()}@test.com`,
        }),
      })
      await expectResponse(res1, GoodMemberCreate)

      // User2 should still be able to add their own member
      const res2 = await request(app, '/api/v1/users/me/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await generateAuthToken(user2.id)}`,
        },
        body: JSON.stringify({
          email: `per-team-2-${crypto.randomUUID()}@test.com`,
        }),
      })
      await expectResponse(res2, GoodMemberCreate)

      config.maxMembers = oldMaxMembers
    })
  })

  describe('getMembers', () => {
    test('succeeds with goodMemberData and returns empty array initially', async () => {
      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      const authToken = await generateAuthToken(user.id)

      const res = await request(app, '/api/v1/users/me/members', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      const body = await expectResponse(res, GoodMemberData)
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.data.length).toBe(0)
    })

    test('returns created members', async () => {
      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      const authToken = await generateAuthToken(user.id)
      const memberEmail1 = `member1-${crypto.randomUUID()}@test.com`
      const memberEmail2 = `member2-${crypto.randomUUID()}@test.com`

      // Create two members
      await request(app, '/api/v1/users/me/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ email: memberEmail1 }),
      })

      await request(app, '/api/v1/users/me/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ email: memberEmail2 }),
      })

      // Get members
      const res = await request(app, '/api/v1/users/me/members', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      const body = await expectResponse(res, GoodMemberData)
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.data.length).toBe(2)

      const emails = body.data.map((m: { email: string }) => m.email)
      expect(emails).toContain(memberEmail1)
      expect(emails).toContain(memberEmail2)
    })
  })

  describe('deleteMember', () => {
    test('succeeds with goodMemberDelete', async () => {
      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      const authToken = await generateAuthToken(user.id)
      const memberEmail = `delete-${crypto.randomUUID()}@test.com`

      // Create a member
      let res = await request(app, '/api/v1/users/me/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ email: memberEmail }),
      })

      const createBody = await expectResponse(res, GoodMemberCreate)
      const memberId = createBody.data.id

      // Delete the member
      res = await request(app, `/api/v1/users/me/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      await expectResponse(res, GoodMemberDelete)

      // Verify member is gone
      res = await request(app, '/api/v1/users/me/members', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      const getBody = await expectResponse(res, GoodMemberData)
      expect(getBody.data.length).toBe(0)
    })

    test('succeeds silently when member does not exist', async () => {
      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      const authToken = await generateAuthToken(user.id)
      const nonExistentId = crypto.randomUUID()

      // Try to delete non-existent member (should succeed silently)
      const res = await request(
        app,
        `/api/v1/users/me/members/${nonExistentId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      )

      await expectResponse(res, GoodMemberDelete)
    })

    test("cannot delete another user's member", async () => {
      // Create first user with a member
      const { user: user1, cleanup: cleanup1 } = await generateRealTestUser()
      createdUserCleanups.push(cleanup1)

      const authToken1 = await generateAuthToken(user1.id)
      const memberEmail = `other-user-${crypto.randomUUID()}@test.com`

      let res = await request(app, '/api/v1/users/me/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken1}`,
        },
        body: JSON.stringify({ email: memberEmail }),
      })

      const createBody = await expectResponse(res, GoodMemberCreate)
      const memberId = createBody.data.id

      // Create second user and try to delete first user's member
      const { user: user2, cleanup: cleanup2 } = await generateRealTestUser()
      createdUserCleanups.push(cleanup2)

      const authToken2 = await generateAuthToken(user2.id)

      // This should succeed (no error) but not delete the member
      res = await request(app, `/api/v1/users/me/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken2}`,
        },
      })

      await expectResponse(res, GoodMemberDelete)

      // Verify the member still exists for user1
      res = await request(app, '/api/v1/users/me/members', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken1}`,
        },
      })

      const getBody = await expectResponse(res, GoodMemberData)
      expect(getBody.data.length).toBe(1)
      expect(getBody.data[0].id).toBe(memberId)
    })
  })
})
