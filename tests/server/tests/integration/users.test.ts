import { config } from '@rctf/config'
import { createDatabase, users } from '@rctf/db'
import {
  BadKnownCtftimeId,
  BadKnownEmail,
  BadKnownName,
  BadUnknownUser,
  BadZeroAuth,
  GoodAvatarUpdated,
  GoodCtftimeAuthSet,
  GoodCtftimeRemoved,
  GoodEmailRemoved,
  GoodEmailSet,
  GoodLogin,
} from '@rctf/types'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import { createToken, TokenKind } from '../../../../apps/api/src/lib/tokens'
import { getApp, request } from '../../app'
import {
  deleteUserByEmail,
  expectResponse,
  generateAuthToken,
  generateRealTestUser,
  generateTestUser,
} from '../../util'

let app: Hono<any>
let oldEmail: typeof config.email
let oldCtftime: typeof config.ctftime

// Track users created during tests for cleanup
const createdUserEmails: string[] = []
const createdUserCleanups: Array<() => Promise<void>> = []

beforeAll(async () => {
  app = await getApp()
  oldEmail = config.email
  oldCtftime = config.ctftime
})

afterAll(async () => {
  config.email = oldEmail
  config.ctftime = oldCtftime
  // Cleanup any remaining test users
  for (const email of createdUserEmails) {
    await deleteUserByEmail(email)
  }
  for (const cleanup of createdUserCleanups) {
    await cleanup()
  }
})

describe('users service', () => {
  describe('createUser - ctftimeId constraint', () => {
    test('duplicate ctftimeId fails with badKnownCtftimeId', async () => {
      config.email = undefined

      const db = createDatabase(config.database.sql).db
      const ctftimeId = `test-ctftime-${crypto.randomUUID()}`

      // Create first user with ctftimeId
      const firstUser = generateTestUser()
      const userId1 = crypto.randomUUID()
      await db.insert(users).values({
        id: userId1,
        ...firstUser,
        ctftimeId,
        perms: 0,
      })
      createdUserEmails.push(firstUser.email)

      // Try to create a second user with the same ctftimeId via ctftime auth
      const ctftimeToken = await createToken(TokenKind.CtftimeAuth, {
        name: 'Test Team',
        ctftimeId,
      })

      // First, enable ctftime
      config.ctftime = {
        clientId: 'test',
        clientSecret: 'test',
      }

      const secondUser = generateTestUser()
      const res = await request(app, '/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...secondUser,
          email: undefined, // No email, use ctftime
          ctftimeToken,
        }),
      })

      await expectResponse(res, BadKnownCtftimeId)
    })
  })

  describe('updateUserEmail', () => {
    test('succeeds with goodEmailSet when email not configured', async () => {
      config.email = undefined

      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      const authToken = await generateAuthToken(user.id)
      const newEmail = `new-${crypto.randomUUID()}@test.com`

      const res = await request(app, '/api/v1/users/me/auth/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ email: newEmail }),
      })

      await expectResponse(res, GoodEmailSet)
    })

    test('fails with badKnownEmail when email already exists', async () => {
      config.email = undefined

      // Create first user
      const { user: user1, cleanup: cleanup1 } = await generateRealTestUser()
      createdUserCleanups.push(cleanup1)

      // Create second user
      const { user: user2, cleanup: cleanup2 } = await generateRealTestUser()
      createdUserCleanups.push(cleanup2)

      const authToken = await generateAuthToken(user2.id)

      // Try to set user2's email to user1's email
      const res = await request(app, '/api/v1/users/me/auth/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ email: user1.email }),
      })

      await expectResponse(res, BadKnownEmail)
    })
  })

  describe('deleteEmail', () => {
    test('succeeds with goodEmailRemoved when user has ctftime auth', async () => {
      config.email = {
        provider: {
          name: 'emails/smtp',
          options: { smtpUrl: 'smtp://example.com' },
        },
        from: 'no-reply@example.com',
      }
      config.ctftime = {
        clientId: 'test',
        clientSecret: 'test',
      }

      const db = createDatabase(config.database.sql).db
      const userId = crypto.randomUUID()
      const testUser = generateTestUser()

      // Create user with both email and ctftimeId
      await db.insert(users).values({
        id: userId,
        ...testUser,
        ctftimeId: `ctftime-${crypto.randomUUID()}`,
        perms: 0,
      })
      createdUserEmails.push(testUser.email)

      const authToken = await generateAuthToken(userId)

      const res = await request(app, '/api/v1/users/me/auth/email', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      await expectResponse(res, GoodEmailRemoved)
    })

    test('fails with badZeroAuth when removing last auth method', async () => {
      config.email = {
        provider: {
          name: 'emails/smtp',
          options: { smtpUrl: 'smtp://example.com' },
        },
        from: 'no-reply@example.com',
      }
      config.ctftime = {
        clientId: 'test',
        clientSecret: 'test',
      }

      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      const authToken = await generateAuthToken(user.id)

      // User only has email, no ctftime - removing email should fail
      const res = await request(app, '/api/v1/users/me/auth/email', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      await expectResponse(res, BadZeroAuth)
    })
  })

  describe('updateCtftimeId', () => {
    test('succeeds with goodCtftimeAuthSet', async () => {
      config.ctftime = {
        clientId: 'test',
        clientSecret: 'test',
      }

      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      const authToken = await generateAuthToken(user.id)
      const newCtftimeId = `new-ctftime-${crypto.randomUUID()}`
      const ctftimeToken = await createToken(TokenKind.CtftimeAuth, {
        name: 'Test Team',
        ctftimeId: newCtftimeId,
      })

      const res = await request(app, '/api/v1/users/me/auth/ctftime', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ ctftimeToken }),
      })

      await expectResponse(res, GoodCtftimeAuthSet)
    })

    test('fails with badKnownCtftimeId when ctftimeId already exists', async () => {
      config.ctftime = {
        clientId: 'test',
        clientSecret: 'test',
      }

      const db = createDatabase(config.database.sql).db
      const existingCtftimeId = `existing-ctftime-${crypto.randomUUID()}`

      // Create first user with ctftimeId
      const userId1 = crypto.randomUUID()
      const testUser1 = generateTestUser()
      await db.insert(users).values({
        id: userId1,
        ...testUser1,
        ctftimeId: existingCtftimeId,
        perms: 0,
      })
      createdUserEmails.push(testUser1.email)

      // Create second user
      const { user: user2, cleanup: cleanup2 } = await generateRealTestUser()
      createdUserCleanups.push(cleanup2)

      const authToken = await generateAuthToken(user2.id)
      const ctftimeToken = await createToken(TokenKind.CtftimeAuth, {
        name: 'Test Team',
        ctftimeId: existingCtftimeId,
      })

      const res = await request(app, '/api/v1/users/me/auth/ctftime', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ ctftimeToken }),
      })

      await expectResponse(res, BadKnownCtftimeId)
    })
  })

  describe('deleteCtftimeId', () => {
    test('succeeds with goodCtftimeRemoved when user has email auth', async () => {
      config.ctftime = {
        clientId: 'test',
        clientSecret: 'test',
      }

      const db = createDatabase(config.database.sql).db
      const userId = crypto.randomUUID()
      const testUser = generateTestUser()

      // Create user with both email and ctftimeId
      await db.insert(users).values({
        id: userId,
        ...testUser,
        ctftimeId: `ctftime-${crypto.randomUUID()}`,
        perms: 0,
      })
      createdUserEmails.push(testUser.email)

      const authToken = await generateAuthToken(userId)

      const res = await request(app, '/api/v1/users/me/auth/ctftime', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      await expectResponse(res, GoodCtftimeRemoved)
    })

    test('fails with badZeroAuth when removing last auth method', async () => {
      config.ctftime = {
        clientId: 'test',
        clientSecret: 'test',
      }

      const db = createDatabase(config.database.sql).db
      const userId = crypto.randomUUID()
      const testUser = generateTestUser()

      // Create user with ONLY ctftimeId (no email)
      await db.insert(users).values({
        id: userId,
        name: testUser.name,
        division: testUser.division,
        email: null,
        ctftimeId: `ctftime-only-${crypto.randomUUID()}`,
        perms: 0,
      })

      // Add cleanup for this user (can't use deleteUserByEmail since no email)
      createdUserCleanups.push(async () => {
        const db = createDatabase(config.database.sql).db
        await db.delete(users).where(eq(users.id, userId))
      })

      const authToken = await generateAuthToken(userId)

      const res = await request(app, '/api/v1/users/me/auth/ctftime', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      await expectResponse(res, BadZeroAuth)
    })
  })

  describe('updateUserAvatar', () => {
    test('succeeds with goodAvatarUpdated when clearing avatar', async () => {
      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      const authToken = await generateAuthToken(user.id)

      // Send request without avatar to clear it
      const formData = new FormData()
      const res = await request(app, '/api/v2/users/me/avatar', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      })

      const body = await expectResponse(res, GoodAvatarUpdated)
      expect(body.data.url).toBeNull()
    })

    test('succeeds with goodAvatarUpdated when uploading valid avatar', async () => {
      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      const authToken = await generateAuthToken(user.id)

      // Create a simple 1x1 PNG image
      const pngData = Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a, // PNG signature
        0x00,
        0x00,
        0x00,
        0x0d,
        0x49,
        0x48,
        0x44,
        0x52, // IHDR chunk
        0x00,
        0x00,
        0x00,
        0x01,
        0x00,
        0x00,
        0x00,
        0x01,
        0x08,
        0x02,
        0x00,
        0x00,
        0x00,
        0x90,
        0x77,
        0x53,
        0xde,
        0x00,
        0x00,
        0x00,
        0x0c,
        0x49,
        0x44,
        0x41, // IDAT chunk
        0x54,
        0x08,
        0xd7,
        0x63,
        0xf8,
        0xff,
        0xff,
        0x3f,
        0x00,
        0x05,
        0xfe,
        0x02,
        0xfe,
        0xdc,
        0xcc,
        0x59,
        0xe7,
        0x00,
        0x00,
        0x00,
        0x00,
        0x49,
        0x45,
        0x4e, // IEND chunk
        0x44,
        0xae,
        0x42,
        0x60,
        0x82,
      ])

      const formData = new FormData()
      formData.append(
        'avatar',
        new Blob([pngData], { type: 'image/png' }),
        'avatar.png'
      )

      const res = await request(app, '/api/v2/users/me/avatar', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      })

      const body = await expectResponse(res, GoodAvatarUpdated)
      expect(typeof body.data.url).toBe('string')
    })
  })

  describe('getUserByCtftimeId via login', () => {
    test('succeeds with goodLogin for existing ctftime user', async () => {
      config.ctftime = {
        clientId: 'test',
        clientSecret: 'test',
      }

      const db = createDatabase(config.database.sql).db
      const userId = crypto.randomUUID()
      const testUser = generateTestUser()
      const ctftimeId = `login-ctftime-${crypto.randomUUID()}`

      // Create user with ctftimeId
      await db.insert(users).values({
        id: userId,
        ...testUser,
        ctftimeId,
        perms: 0,
      })
      createdUserEmails.push(testUser.email)

      const ctftimeToken = await createToken(TokenKind.CtftimeAuth, {
        name: testUser.name,
        ctftimeId,
      })

      const res = await request(app, '/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ctftimeToken }),
      })

      const body = await expectResponse(res, GoodLogin)
      expect(typeof body.data.authToken).toBe('string')
    })

    test('fails with badUnknownUser for non-existent ctftime user', async () => {
      config.ctftime = {
        clientId: 'test',
        clientSecret: 'test',
      }

      const ctftimeToken = await createToken(TokenKind.CtftimeAuth, {
        name: 'Non-existent Team',
        ctftimeId: `nonexistent-${crypto.randomUUID()}`,
      })

      const res = await request(app, '/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ctftimeToken }),
      })

      await expectResponse(res, BadUnknownUser)
    })
  })

  describe('getUserByNameOrEmail via register', () => {
    test('checks for existing user by name during registration', async () => {
      config.email = {
        provider: {
          name: 'emails/smtp',
          options: { smtpUrl: 'smtp://example.com' },
        },
        from: 'no-reply@example.com',
      }

      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      // Try to register with same name
      const res = await request(app, '/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.name,
          email: `new-${crypto.randomUUID()}@test.com`,
          division: user.division,
        }),
      })

      await expectResponse(res, BadKnownName)
    })

    test('checks for existing user by email during registration', async () => {
      config.email = {
        provider: {
          name: 'emails/smtp',
          options: { smtpUrl: 'smtp://example.com' },
        },
        from: 'no-reply@example.com',
      }

      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      // Try to register with same email but different name
      const res = await request(app, '/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `new-${crypto.randomUUID()}`,
          email: user.email,
          division: user.division,
        }),
      })

      await expectResponse(res, BadKnownEmail)
    })
  })

  describe('getUserAvatars', () => {
    test('returns empty map for empty userIds array', async () => {
      const { getUserAvatars } =
        await import('../../../../apps/api/src/services/users')
      const db = createDatabase(config.database.sql).db

      const result = await getUserAvatars(db, [])
      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(0)
    })

    test('returns avatar URLs for existing users', async () => {
      const { getUserAvatars } =
        await import('../../../../apps/api/src/services/users')
      const db = createDatabase(config.database.sql).db

      // Create users with and without avatars
      const { user: user1, cleanup: cleanup1 } = await generateRealTestUser()
      createdUserCleanups.push(cleanup1)

      const userId2 = crypto.randomUUID()
      const testUser2 = generateTestUser()
      await db.insert(users).values({
        id: userId2,
        ...testUser2,
        avatarUrl: 'https://example.com/avatar.webp',
        perms: 0,
      })
      createdUserEmails.push(testUser2.email)

      const result = await getUserAvatars(db, [user1.id, userId2])
      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(2)
      expect(result.get(user1.id)).toBeNull() // No avatar
      expect(result.get(userId2)).toBe('https://example.com/avatar.webp')
    })

    test('returns only found users', async () => {
      const { getUserAvatars } =
        await import('../../../../apps/api/src/services/users')
      const db = createDatabase(config.database.sql).db

      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      const nonExistentId = crypto.randomUUID()
      const result = await getUserAvatars(db, [user.id, nonExistentId])

      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(1)
      expect(result.has(user.id)).toBe(true)
      expect(result.has(nonExistentId)).toBe(false)
    })
  })

  describe('updateUserInternal - duplicate name', () => {
    test('fails with badKnownName when updating to existing name', async () => {
      config.email = undefined

      // Create first user
      const { user: user1, cleanup: cleanup1 } = await generateRealTestUser()
      createdUserCleanups.push(cleanup1)

      // Create second user
      const { user: user2, cleanup: cleanup2 } = await generateRealTestUser()
      createdUserCleanups.push(cleanup2)

      const authToken = await generateAuthToken(user2.id)

      // Try to update user2's name to user1's name
      const res = await request(app, '/api/v1/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name: user1.name }),
      })

      await expectResponse(res, BadKnownName)
    })
  })
})
