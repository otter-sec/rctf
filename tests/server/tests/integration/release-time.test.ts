import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { config } from '@rctf/config'
import {
  challenges,
  createDatabase,
  solves,
  type ChallengeData,
} from '@rctf/db'
import {
  BadBody,
  BadChallenge,
  GoodChallenges,
  GoodFlag,
  Permissions,
} from '@rctf/types'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import { getApp, request } from '../../app'
import {
  expectResponse,
  generateAuthToken,
  generateChallengeWithReleaseTime,
  generateRealTestUser,
} from '../../util'

let app: Hono<any>
const createdUserCleanups: Array<() => Promise<void>> = []
const createdChallengeCleanups: Array<() => Promise<void>> = []

// Use mocked createDatabase - it returns pglite instance
const getDb = () => createDatabase(config.database.sql).db

beforeAll(async () => {
  app = await getApp()
})

afterAll(async () => {
  for (const cleanup of createdUserCleanups) {
    await cleanup()
  }
  for (const cleanup of createdChallengeCleanups) {
    await cleanup()
  }
})

describe('challenge release time', () => {
  describe('isChallengePublic via getChallenges', () => {
    test('challenge with no releaseTime is visible', async () => {
      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      const { challenge, cleanup: challengeCleanup } =
        await generateChallengeWithReleaseTime(null)
      createdChallengeCleanups.push(challengeCleanup)

      const authToken = await generateAuthToken(user.id)

      const res = await request(app, '/api/v1/challs', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      const body = await expectResponse(res, GoodChallenges)
      const found = body.data.find((c: any) => c.id === challenge.id)
      expect(found).toBeDefined()
    })

    test('challenge with releaseTime=0 is visible', async () => {
      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      const { challenge, cleanup: challengeCleanup } =
        await generateChallengeWithReleaseTime(0)
      createdChallengeCleanups.push(challengeCleanup)

      const authToken = await generateAuthToken(user.id)

      const res = await request(app, '/api/v1/challs', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      const body = await expectResponse(res, GoodChallenges)
      const found = body.data.find((c: any) => c.id === challenge.id)
      expect(found).toBeDefined()
    })

    test('challenge with past releaseTime is visible', async () => {
      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      // Release time 1 hour in the past
      const pastTime = Date.now() - 60 * 60 * 1000
      const { challenge, cleanup: challengeCleanup } =
        await generateChallengeWithReleaseTime(pastTime)
      createdChallengeCleanups.push(challengeCleanup)

      const authToken = await generateAuthToken(user.id)

      const res = await request(app, '/api/v1/challs', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      const body = await expectResponse(res, GoodChallenges)
      const found = body.data.find((c: any) => c.id === challenge.id)
      expect(found).toBeDefined()
    })

    test('challenge with future releaseTime is NOT visible', async () => {
      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      // Release time 1 hour in the future
      const futureTime = Date.now() + 60 * 60 * 1000
      const { challenge, cleanup: challengeCleanup } =
        await generateChallengeWithReleaseTime(futureTime)
      createdChallengeCleanups.push(challengeCleanup)

      const authToken = await generateAuthToken(user.id)

      const res = await request(app, '/api/v1/challs', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      const body = await expectResponse(res, GoodChallenges)
      const found = body.data.find((c: any) => c.id === challenge.id)
      expect(found).toBeUndefined()
    })
  })

  describe('hidden takes priority over releaseTime', () => {
    test('hidden challenge with past releaseTime is NOT visible', async () => {
      const db = getDb()
      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      const id = crypto.randomUUID()
      const data: ChallengeData = {
        name: crypto.randomUUID(),
        description: crypto.randomUUID(),
        category: crypto.randomUUID(),
        author: crypto.randomUUID(),
        files: [],
        flag: crypto.randomUUID(),
        tiebreakEligible: true,
        points: { min: 100, max: 500 },
        hidden: true,
        releaseTime: Date.now() - 60 * 60 * 1000, // Past
      }

      await db.insert(challenges).values({ id, data })
      createdChallengeCleanups.push(async () => {
        await db.delete(solves).where(eq(solves.challengeid, id))
        await db.delete(challenges).where(eq(challenges.id, id))
      })

      const authToken = await generateAuthToken(user.id)

      const res = await request(app, '/api/v1/challs', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      const body = await expectResponse(res, GoodChallenges)
      const found = body.data.find((c: any) => c.id === id)
      expect(found).toBeUndefined()
    })
  })

  describe('flag submission respects releaseTime', () => {
    test('cannot submit flag for challenge with future releaseTime', async () => {
      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      // Release time 1 hour in the future
      const futureTime = Date.now() + 60 * 60 * 1000
      const { challenge, cleanup: challengeCleanup } =
        await generateChallengeWithReleaseTime(futureTime)
      createdChallengeCleanups.push(challengeCleanup)

      const authToken = await generateAuthToken(user.id)

      const res = await request(app, `/api/v1/challs/${challenge.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ flag: challenge.flag }),
      })

      await expectResponse(res, BadChallenge)
    })

    test('can submit flag for challenge with past releaseTime', async () => {
      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      // Release time 1 hour in the past
      const pastTime = Date.now() - 60 * 60 * 1000
      const { challenge, cleanup: challengeCleanup } =
        await generateChallengeWithReleaseTime(pastTime)
      createdChallengeCleanups.push(challengeCleanup)

      const authToken = await generateAuthToken(user.id)

      const res = await request(app, `/api/v1/challs/${challenge.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ flag: challenge.flag }),
      })

      await expectResponse(res, GoodFlag)
    })
  })

  describe('admin can still see unreleased challenges', () => {
    test('admin route returns challenges with future releaseTime', async () => {
      const adminPerms = Permissions.challsRead
      const { user, cleanup } = await generateRealTestUser(adminPerms)
      createdUserCleanups.push(cleanup)

      // Release time 1 hour in the future
      const futureTime = Date.now() + 60 * 60 * 1000
      const { challenge, cleanup: challengeCleanup } =
        await generateChallengeWithReleaseTime(futureTime)
      createdChallengeCleanups.push(challengeCleanup)

      const authToken = await generateAuthToken(user.id)

      const res = await request(app, '/api/v2/admin/challs', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      const found = body.data.find((c: any) => c.id === challenge.id)
      expect(found).toBeDefined()
      expect(found.releaseTime).toBe(futureTime)
    })
  })

  describe('releaseTime can be updated via admin route', () => {
    test('can set and clear releaseTime', async () => {
      const adminPerms = Permissions.challsRead | Permissions.challsWrite
      const { user, cleanup } = await generateRealTestUser(adminPerms)
      createdUserCleanups.push(cleanup)

      const { challenge, cleanup: challengeCleanup } =
        await generateChallengeWithReleaseTime(null)
      createdChallengeCleanups.push(challengeCleanup)

      const authToken = await generateAuthToken(user.id)

      // Set releaseTime
      const futureTime = Date.now() + 60 * 60 * 1000
      let res = await request(app, `/api/v2/admin/challs/${challenge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          data: {
            releaseTime: futureTime,
          },
        }),
      })

      expect(res.status).toBe(200)
      let body = await res.json()
      expect(body.data.releaseTime).toBe(futureTime)

      // Clear releaseTime
      res = await request(app, `/api/v2/admin/challs/${challenge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          data: {
            releaseTime: null,
          },
        }),
      })

      expect(res.status).toBe(200)
      body = await res.json()
      expect(body.data.releaseTime).toBeNull()
    })

    test('rejects fractional releaseTime', async () => {
      const adminPerms = Permissions.challsRead | Permissions.challsWrite
      const { user, cleanup } = await generateRealTestUser(adminPerms)
      createdUserCleanups.push(cleanup)

      const { challenge, cleanup: challengeCleanup } =
        await generateChallengeWithReleaseTime(null)
      createdChallengeCleanups.push(challengeCleanup)

      const authToken = await generateAuthToken(user.id)

      const res = await request(app, `/api/v2/admin/challs/${challenge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          data: {
            releaseTime: Date.now() + 0.5,
          },
        }),
      })

      await expectResponse(res, BadBody)
    })
  })
})
