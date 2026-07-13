import { config } from '@rctf/config'
import { challenges, createDatabase, solves, users } from '@rctf/db'
import {
  BadChallenge,
  BadRateLimit,
  BadUnknownSolveV2,
  GoodChallengeDelete,
  GoodChallengeSolveDeleteV2,
  GoodChallengeSolves,
  GoodChallengeSolvesV2,
  GoodChallengeUpdate,
  GoodChallengeUpdateV2,
  GoodFlag,
  GoodLeaderboardV2,
  Permissions,
} from '@rctf/types'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import { applyDecayPointsForAllChallenges } from '../../../../apps/api/src/services/solve-points'
import { getApp, request } from '../../app'
import {
  expectResponse,
  generateAuthToken,
  generateChallenge,
  generateRealTestUser,
} from '../../util'

let app: Hono<any>
const createdUserCleanups: Array<() => Promise<void>> = []
const createdChallengeCleanups: Array<() => Promise<void>> = []

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

describe('challenges service', () => {
  describe('upsertChallenge via admin routes', () => {
    test('creates and updates a challenge', async () => {
      const adminPerms = Permissions.challsRead | Permissions.challsWrite
      const { user, cleanup } = await generateRealTestUser(adminPerms)
      createdUserCleanups.push(cleanup)

      const authToken = await generateAuthToken(user.id)
      const challengeId = crypto.randomUUID()

      let res = await request(app, `/api/v1/admin/challs/${challengeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          data: {
            name: 'Test Challenge',
            description: 'A test challenge',
            category: 'misc',
            author: 'tester',
            flag: 'flag{test}',
            points: { min: 100, max: 500 },
          },
        }),
      })

      let body = await expectResponse(res, GoodChallengeUpdate)
      expect(body.data.id).toBe(challengeId)
      expect(body.data.name).toBe('Test Challenge')

      // Update challenge
      res = await request(app, `/api/v1/admin/challs/${challengeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          data: {
            name: 'Updated Challenge Name',
            description: 'Updated description',
          },
        }),
      })

      body = await expectResponse(res, GoodChallengeUpdate)
      expect(body.data.id).toBe(challengeId)
      expect(body.data.name).toBe('Updated Challenge Name')
      expect(body.data.description).toBe('Updated description')
      // Original fields should be preserved
      expect(body.data.category).toBe('misc')

      const db = createDatabase(config.database.sql).db
      createdChallengeCleanups.push(async () => {
        await db.delete(solves).where(eq(solves.challengeid, challengeId))
        await db.delete(challenges).where(eq(challenges.id, challengeId))
      })
    })
  })

  describe('update-challenge scoring-config change', () => {
    const getSolvePoints = async (
      db: ReturnType<typeof createDatabase>['db'],
      solveId: string
    ): Promise<number> => {
      const [row] = await db
        .select({ points: solves.points })
        .from(solves)
        .where(eq(solves.id, solveId))
        .limit(1)
      return row!.points
    }

    test('v1 PUT reprices existing solves when points config changes', async () => {
      const adminPerms = Permissions.challsRead | Permissions.challsWrite
      const { user: admin, cleanup: adminCleanup } =
        await generateRealTestUser(adminPerms)
      const { user: solver, cleanup: solverCleanup } =
        await generateRealTestUser()
      createdUserCleanups.push(adminCleanup, solverCleanup)

      const { challenge, cleanup: challengeCleanup } = await generateChallenge()
      createdChallengeCleanups.push(challengeCleanup)

      const db = createDatabase(config.database.sql).db
      const solveId = crypto.randomUUID()
      await db.insert(solves).values({
        id: solveId,
        challengeid: challenge.id,
        userid: solver.id,
        createdat: new Date().toISOString(),
      })

      await applyDecayPointsForAllChallenges(db)
      const before = await getSolvePoints(db, solveId)

      const authToken = await generateAuthToken(admin.id)
      const res = await request(app, `/api/v1/admin/challs/${challenge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          data: { points: { min: 100, max: 1000 } },
        }),
      })
      await expectResponse(res, GoodChallengeUpdate)

      const after = await getSolvePoints(db, solveId)
      expect(after).not.toBe(before)
    })

    test('v2 PUT reprices existing solves when points config changes', async () => {
      const adminPerms = Permissions.challsRead | Permissions.challsWrite
      const { user: admin, cleanup: adminCleanup } =
        await generateRealTestUser(adminPerms)
      const { user: solver, cleanup: solverCleanup } =
        await generateRealTestUser()
      createdUserCleanups.push(adminCleanup, solverCleanup)

      const { challenge, cleanup: challengeCleanup } = await generateChallenge()
      createdChallengeCleanups.push(challengeCleanup)

      const db = createDatabase(config.database.sql).db
      const solveId = crypto.randomUUID()
      await db.insert(solves).values({
        id: solveId,
        challengeid: challenge.id,
        userid: solver.id,
        createdat: new Date().toISOString(),
      })

      await applyDecayPointsForAllChallenges(db)
      const before = await getSolvePoints(db, solveId)

      const authToken = await generateAuthToken(admin.id)
      const res = await request(app, `/api/v2/admin/challs/${challenge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          data: { points: { min: 100, max: 1000 } },
        }),
      })
      await expectResponse(res, GoodChallengeUpdateV2)

      const after = await getSolvePoints(db, solveId)
      expect(after).not.toBe(before)
    })

    test('v2 PUT leaves solves untouched when only metadata changes', async () => {
      const adminPerms = Permissions.challsRead | Permissions.challsWrite
      const { user: admin, cleanup: adminCleanup } =
        await generateRealTestUser(adminPerms)
      const { user: solver, cleanup: solverCleanup } =
        await generateRealTestUser()
      createdUserCleanups.push(adminCleanup, solverCleanup)

      const { challenge, cleanup: challengeCleanup } = await generateChallenge()
      createdChallengeCleanups.push(challengeCleanup)

      const db = createDatabase(config.database.sql).db
      const solveId = crypto.randomUUID()
      await db.insert(solves).values({
        id: solveId,
        challengeid: challenge.id,
        userid: solver.id,
        createdat: new Date().toISOString(),
      })

      await applyDecayPointsForAllChallenges(db)
      const before = await getSolvePoints(db, solveId)

      const authToken = await generateAuthToken(admin.id)
      const res = await request(app, `/api/v2/admin/challs/${challenge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          data: { description: 'unrelated metadata edit' },
        }),
      })
      await expectResponse(res, GoodChallengeUpdateV2)

      expect(await getSolvePoints(db, solveId)).toBe(before)
    })
  })

  describe('deleteChallenge via admin route', () => {
    test('deletes a challenge and its solves', async () => {
      const adminPerms = Permissions.challsRead | Permissions.challsWrite
      const { user, cleanup } = await generateRealTestUser(adminPerms)
      createdUserCleanups.push(cleanup)

      const { challenge } = await generateChallenge()
      const authToken = await generateAuthToken(user.id)

      const db = createDatabase(config.database.sql).db
      await db.insert(solves).values({
        id: crypto.randomUUID(),
        challengeid: challenge.id,
        userid: user.id,
        createdat: new Date().toISOString(),
      })

      const res = await request(app, `/api/v1/admin/challs/${challenge.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      await expectResponse(res, GoodChallengeDelete)

      const remainingChallenge = await db
        .select()
        .from(challenges)
        .where(eq(challenges.id, challenge.id))
        .limit(1)
      expect(remainingChallenge.length).toBe(0)
    })
  })

  describe('getChallengeSolves via v1 route', () => {
    test('returns solves for a challenge', async () => {
      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      const { challenge, cleanup: challengeCleanup } = await generateChallenge()
      createdChallengeCleanups.push(challengeCleanup)

      const db = createDatabase(config.database.sql).db
      await db.insert(solves).values({
        id: crypto.randomUUID(),
        challengeid: challenge.id,
        userid: user.id,
        createdat: new Date().toISOString(),
      })

      const authToken = await generateAuthToken(user.id)

      const res = await request(
        app,
        `/api/v1/challs/${challenge.id}/solves?limit=10&offset=0`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      )

      const body = await expectResponse(res, GoodChallengeSolves)
      expect(Array.isArray(body.data.solves)).toBe(true)
      expect(body.data.solves.length).toBe(1)
      expect(body.data.solves[0].userId).toBe(user.id)
    })

    test('excludes banned team solves', async () => {
      const { user: activeUser, cleanup: activeCleanup } =
        await generateRealTestUser()
      const { user: bannedUser, cleanup: bannedCleanup } =
        await generateRealTestUser()
      createdUserCleanups.push(activeCleanup, bannedCleanup)

      const { challenge, cleanup: challengeCleanup } = await generateChallenge()
      createdChallengeCleanups.push(challengeCleanup)

      const db = createDatabase(config.database.sql).db
      await db
        .update(users)
        .set({ banned: true })
        .where(eq(users.id, bannedUser.id))
      await db.insert(solves).values([
        {
          id: crypto.randomUUID(),
          challengeid: challenge.id,
          userid: bannedUser.id,
          createdat: new Date(Date.now() - 10000).toISOString(),
        },
        {
          id: crypto.randomUUID(),
          challengeid: challenge.id,
          userid: activeUser.id,
          createdat: new Date().toISOString(),
        },
      ])

      const authToken = await generateAuthToken(activeUser.id)
      const res = await request(
        app,
        `/api/v1/challs/${challenge.id}/solves?limit=10&offset=0`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      )

      const body = await expectResponse(res, GoodChallengeSolves)
      expect(body.data.solves).toHaveLength(1)
      expect(body.data.solves[0].userId).toBe(activeUser.id)
    })

    test('returns badChallenge for non-existent challenge', async () => {
      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      const authToken = await generateAuthToken(user.id)
      const nonExistentId = crypto.randomUUID()

      const res = await request(
        app,
        `/api/v1/challs/${nonExistentId}/solves?limit=10&offset=0`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      )

      await expectResponse(res, BadChallenge)
    })
  })

  describe('getChallengeSolvesWithPosition via v2 route', () => {
    test('returns solves with position info', async () => {
      const { user: user1, cleanup: cleanup1 } = await generateRealTestUser()
      createdUserCleanups.push(cleanup1)

      const { user: user2, cleanup: cleanup2 } = await generateRealTestUser()
      createdUserCleanups.push(cleanup2)

      const { challenge, cleanup: challengeCleanup } = await generateChallenge()
      createdChallengeCleanups.push(challengeCleanup)

      const db = createDatabase(config.database.sql).db
      await db.insert(solves).values({
        id: crypto.randomUUID(),
        challengeid: challenge.id,
        userid: user1.id,
        createdat: new Date(Date.now() - 10000).toISOString(),
      })
      await db.insert(solves).values({
        id: crypto.randomUUID(),
        challengeid: challenge.id,
        userid: user2.id,
        createdat: new Date().toISOString(),
      })

      const authToken = await generateAuthToken(user2.id)

      const res = await request(
        app,
        `/api/v2/challs/${challenge.id}/solves?limit=10&offset=0`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      )

      const body = await expectResponse(res, GoodChallengeSolvesV2)
      expect(Array.isArray(body.data.solves)).toBe(true)
      expect(body.data.solves.length).toBe(2)
      expect(body.data.mySolvePosition).toBe(2)
    })

    test('excludes banned team solves from positions', async () => {
      const { user: activeUser, cleanup: activeCleanup } =
        await generateRealTestUser()
      const { user: bannedUser, cleanup: bannedCleanup } =
        await generateRealTestUser()
      createdUserCleanups.push(activeCleanup, bannedCleanup)

      const { challenge, cleanup: challengeCleanup } = await generateChallenge()
      createdChallengeCleanups.push(challengeCleanup)

      const db = createDatabase(config.database.sql).db
      await db
        .update(users)
        .set({ banned: true })
        .where(eq(users.id, bannedUser.id))
      await db.insert(solves).values([
        {
          id: crypto.randomUUID(),
          challengeid: challenge.id,
          userid: bannedUser.id,
          createdat: new Date(Date.now() - 10000).toISOString(),
        },
        {
          id: crypto.randomUUID(),
          challengeid: challenge.id,
          userid: activeUser.id,
          createdat: new Date().toISOString(),
        },
      ])

      const authToken = await generateAuthToken(activeUser.id)
      const res = await request(
        app,
        `/api/v2/challs/${challenge.id}/solves?limit=10&offset=0`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      )

      const body = await expectResponse(res, GoodChallengeSolvesV2)
      expect(body.data.solves).toHaveLength(1)
      expect(body.data.solves[0].userId).toBe(activeUser.id)
      expect(body.data.solves[0].bloodIndex).toBe(0)
      expect(body.data.mySolvePosition).toBe(1)
    })

    test('returns empty solves for challenge with no solves', async () => {
      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      const { challenge, cleanup: challengeCleanup } = await generateChallenge()
      createdChallengeCleanups.push(challengeCleanup)

      const authToken = await generateAuthToken(user.id)

      const res = await request(
        app,
        `/api/v2/challs/${challenge.id}/solves?limit=10&offset=0`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      )

      const body = await expectResponse(res, GoodChallengeSolvesV2)
      expect(body.data.solves).toEqual([])
      expect(body.data.mySolvePosition).toBeNull()
    })

    test('returns badChallenge for non-existent challenge', async () => {
      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      const authToken = await generateAuthToken(user.id)
      const nonExistentId = crypto.randomUUID()

      const res = await request(
        app,
        `/api/v2/challs/${nonExistentId}/solves?limit=10&offset=0`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      )

      await expectResponse(res, BadChallenge)
    })
  })

  describe('getSolvesAvatarsBloods via v2 leaderboard', () => {
    test('returns leaderboard with solves and first blood info', async () => {
      // Create users with solves
      const { user: user1, cleanup: cleanup1 } = await generateRealTestUser()
      createdUserCleanups.push(cleanup1)

      const { challenge, cleanup: challengeCleanup } = await generateChallenge()
      createdChallengeCleanups.push(challengeCleanup)

      // Create a solve to appear on leaderboard
      const db = createDatabase(config.database.sql).db
      await db.insert(solves).values({
        id: crypto.randomUUID(),
        challengeid: challenge.id,
        userid: user1.id,
        createdat: new Date().toISOString(),
      })

      // Wait for leaderboard to potentially update
      await new Promise(resolve => setTimeout(resolve, 100))

      const res = await request(
        app,
        '/api/v2/leaderboard/now?limit=100&offset=0',
        {
          method: 'GET',
        }
      )

      const body = await expectResponse(res, GoodLeaderboardV2)
      expect(Array.isArray(body.data.leaderboard)).toBe(true)
    })
  })

  describe('submitFlag rate limiting', () => {
    test('returns badRateLimit after too many attempts', async () => {
      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      const { challenge, cleanup: challengeCleanup } = await generateChallenge()
      createdChallengeCleanups.push(challengeCleanup)

      const authToken = await generateAuthToken(user.id)

      for (let i = 0; i < 5; i++) {
        await request(app, `/api/v1/challs/${challenge.id}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ flag: 'wrong_flag' }),
        })
      }

      const res = await request(app, `/api/v1/challs/${challenge.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ flag: 'wrong_flag' }),
      })

      const body = await expectResponse(res, BadRateLimit)
      expect(typeof body.data.timeLeft).toBe('number')
      expect(body.data.timeLeft).toBeGreaterThan(0)
    })
  })

  describe('deleteSolve via v2 admin route', () => {
    test('successfully deletes a solve', async () => {
      const adminPerms =
        Permissions.challsRead |
        Permissions.challsWrite |
        Permissions.challsSolveWrite

      const { user: admin, cleanup: adminCleanup } =
        await generateRealTestUser(adminPerms)
      createdUserCleanups.push(adminCleanup)

      const { user: solver, cleanup: solverCleanup } =
        await generateRealTestUser()
      createdUserCleanups.push(solverCleanup)

      const { challenge, cleanup: challengeCleanup } = await generateChallenge()
      createdChallengeCleanups.push(challengeCleanup)

      const db = createDatabase(config.database.sql).db
      await db.insert(solves).values({
        id: crypto.randomUUID(),
        challengeid: challenge.id,
        userid: solver.id,
        createdat: new Date().toISOString(),
      })

      const authToken = await generateAuthToken(admin.id)

      const res = await request(
        app,
        `/api/v2/admin/challs/${challenge.id}/solves/${solver.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      )

      await expectResponse(res, GoodChallengeSolveDeleteV2)

      const remainingSolves = await db
        .select()
        .from(solves)
        .where(eq(solves.challengeid, challenge.id))
      expect(remainingSolves.length).toBe(0)
    })

    test('returns badUnknownSolveV2 for non-existent solve', async () => {
      const adminPerms =
        Permissions.challsRead |
        Permissions.challsWrite |
        Permissions.challsSolveWrite

      const { user: admin, cleanup: adminCleanup } =
        await generateRealTestUser(adminPerms)
      createdUserCleanups.push(adminCleanup)

      const { challenge, cleanup: challengeCleanup } = await generateChallenge()
      createdChallengeCleanups.push(challengeCleanup)

      const authToken = await generateAuthToken(admin.id)
      const nonExistentUserId = crypto.randomUUID()

      const res = await request(
        app,
        `/api/v2/admin/challs/${challenge.id}/solves/${nonExistentUserId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      )

      await expectResponse(res, BadUnknownSolveV2)
    })
  })

  describe('createRankedSolves (tested via getChallengeSolvesWithPosition)', () => {
    test('handles multiple users solving same challenge with division positions', async () => {
      const db = createDatabase(config.database.sql).db

      const division1 = Object.keys(config.divisions)[0]!
      const division2 = Object.keys(config.divisions)[1] ?? division1

      const user1Id = crypto.randomUUID()
      const user2Id = crypto.randomUUID()
      const user3Id = crypto.randomUUID()

      await db
        .insert(users)
        .values({
          id: user1Id,
          name: crypto.randomUUID(),
          email: `${crypto.randomUUID()}@test.com`,
          division: division1,
          perms: 0,
        })
        .returning()

      await db
        .insert(users)
        .values({
          id: user2Id,
          name: crypto.randomUUID(),
          email: `${crypto.randomUUID()}@test.com`,
          division: division1,
          perms: 0,
        })
        .returning()

      await db
        .insert(users)
        .values({
          id: user3Id,
          name: crypto.randomUUID(),
          email: `${crypto.randomUUID()}@test.com`,
          division: division2,
          perms: 0,
        })
        .returning()

      createdUserCleanups.push(async () => {
        await db.delete(solves).where(eq(solves.userid, user1Id))
        await db.delete(users).where(eq(users.id, user1Id))
      })
      createdUserCleanups.push(async () => {
        await db.delete(solves).where(eq(solves.userid, user2Id))
        await db.delete(users).where(eq(users.id, user2Id))
      })
      createdUserCleanups.push(async () => {
        await db.delete(solves).where(eq(solves.userid, user3Id))
        await db.delete(users).where(eq(users.id, user3Id))
      })

      const { challenge, cleanup: challengeCleanup } = await generateChallenge()
      createdChallengeCleanups.push(challengeCleanup)

      await db.insert(solves).values({
        id: crypto.randomUUID(),
        challengeid: challenge.id,
        userid: user1Id,
        createdat: new Date(Date.now() - 30000).toISOString(), // First
      })
      await db.insert(solves).values({
        id: crypto.randomUUID(),
        challengeid: challenge.id,
        userid: user3Id,
        createdat: new Date(Date.now() - 20000).toISOString(), // Second (different division)
      })
      await db.insert(solves).values({
        id: crypto.randomUUID(),
        challengeid: challenge.id,
        userid: user2Id,
        createdat: new Date(Date.now() - 10000).toISOString(), // Third
      })

      const authToken = await generateAuthToken(user2Id)

      const res = await request(
        app,
        `/api/v2/challs/${challenge.id}/solves?limit=10&offset=0`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      )

      const body = await expectResponse(res, GoodChallengeSolvesV2)
      expect(body.data.solves.length).toBe(3)

      // Check global positions
      expect(body.data.solves[0].userId).toBe(user1Id)
      expect(body.data.solves[1].userId).toBe(user3Id)
      expect(body.data.solves[2].userId).toBe(user2Id)
      expect(body.data.mySolvePosition).toBe(3)
    })
  })

  describe('upsertChallenge handles partial updates', () => {
    test('preserves existing fields when updating', async () => {
      const adminPerms = Permissions.challsRead | Permissions.challsWrite
      const { user, cleanup } = await generateRealTestUser(adminPerms)
      createdUserCleanups.push(cleanup)

      const { challenge, cleanup: challengeCleanup } = await generateChallenge()
      createdChallengeCleanups.push(challengeCleanup)

      const authToken = await generateAuthToken(user.id)

      const res = await request(app, `/api/v1/admin/challs/${challenge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          data: {
            name: 'New Name Only',
          },
        }),
      })

      const body = await expectResponse(res, GoodChallengeUpdate)
      expect(body.data.name).toBe('New Name Only')
      expect(body.data.category).toBe(challenge.category)
      expect(body.data.author).toBe(challenge.author)
      expect(body.data.description).toBe(challenge.description)
    })
  })

  describe('submitFlag with correct flag after rate limit expires', () => {
    test('succeeds after rate limit expires', async () => {
      const { user, cleanup } = await generateRealTestUser()
      createdUserCleanups.push(cleanup)

      const { challenge, cleanup: challengeCleanup } = await generateChallenge()
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
})
