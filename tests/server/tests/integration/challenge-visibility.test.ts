import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { config } from '@rctf/config'
import {
  challenges,
  createDatabase,
  solves,
  type ChallengeData,
} from '@rctf/db'
import {
  BadChallenge,
  GoodChallengeSolves,
  GoodChallengeSolvesV2,
  GoodUserData,
  GoodUserSelfData,
} from '@rctf/types'
import { calculateLeaderboard } from '../../../../apps/api/src/services/leaderboard'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import { getApp, request } from '../../app'
import {
  expectResponse,
  generateAuthToken,
  generateChallenge,
  generateRealTestUser,
} from '../../util'

let app: Hono<any>
const cleanups: Array<() => Promise<void>> = []

const getDb = () => createDatabase(config.database.sql).db

const insertChallenge = async (opts: {
  hidden?: boolean
  releaseTime?: number | null
}) => {
  const db = getDb()
  const id = crypto.randomUUID()
  const flag = crypto.randomUUID()

  const data: ChallengeData = {
    name: crypto.randomUUID(),
    description: crypto.randomUUID(),
    category: crypto.randomUUID(),
    author: crypto.randomUUID(),
    files: [],
    flag,
    tiebreakEligible: true,
    points: { min: 100, max: 500 },
    hidden: opts.hidden,
    releaseTime: opts.releaseTime,
  }

  await db.insert(challenges).values({ id, data })
  cleanups.push(async () => {
    await db.delete(solves).where(eq(solves.challengeid, id))
    await db.delete(challenges).where(eq(challenges.id, id))
  })

  return { id, flag, data }
}

const insertSolve = async (challengeId: string, userId: string) => {
  const db = getDb()
  await db.insert(solves).values({
    id: crypto.randomUUID(),
    challengeid: challengeId,
    userid: userId,
    createdat: new Date().toISOString(),
  })
}

beforeAll(async () => {
  app = await getApp()
})

afterAll(async () => {
  for (const cleanup of cleanups) {
    await cleanup()
  }
})

describe('challenge visibility filtering', () => {
  describe('user profile excludes non-public challenge solves', () => {
    test('hidden challenge solve is excluded from /api/v1/users/me', async () => {
      const { user, cleanup } = await generateRealTestUser()
      cleanups.push(cleanup)

      const visible = await insertChallenge({})
      const hidden = await insertChallenge({ hidden: true })

      await insertSolve(visible.id, user.id)
      await insertSolve(hidden.id, user.id)

      const authToken = await generateAuthToken(user.id)
      const res = await request(app, '/api/v1/users/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${authToken}` },
      })

      const body = await expectResponse(res, GoodUserSelfData)
      const solveIds = body.data.solves.map((s: any) => s.id)
      expect(solveIds).toContain(visible.id)
      expect(solveIds).not.toContain(hidden.id)
    })

    test('unreleased challenge solve is excluded from /api/v1/users/me', async () => {
      const { user, cleanup } = await generateRealTestUser()
      cleanups.push(cleanup)

      const visible = await insertChallenge({})
      const unreleased = await insertChallenge({
        releaseTime: Date.now() + 60 * 60 * 1000,
      })

      await insertSolve(visible.id, user.id)
      await insertSolve(unreleased.id, user.id)

      const authToken = await generateAuthToken(user.id)
      const res = await request(app, '/api/v1/users/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${authToken}` },
      })

      const body = await expectResponse(res, GoodUserSelfData)
      const solveIds = body.data.solves.map((s: any) => s.id)
      expect(solveIds).toContain(visible.id)
      expect(solveIds).not.toContain(unreleased.id)
    })

    test('hidden challenge solve is excluded from /api/v1/users/:id', async () => {
      const { user, cleanup } = await generateRealTestUser()
      cleanups.push(cleanup)

      const visible = await insertChallenge({})
      const hidden = await insertChallenge({ hidden: true })

      await insertSolve(visible.id, user.id)
      await insertSolve(hidden.id, user.id)

      const res = await request(app, `/api/v1/users/${user.id}`, {
        method: 'GET',
      })

      const body = await expectResponse(res, GoodUserData)
      const solveIds = body.data.solves.map((s: any) => s.id)
      expect(solveIds).toContain(visible.id)
      expect(solveIds).not.toContain(hidden.id)
    })

    test('unreleased challenge solve is excluded from /api/v1/users/:id', async () => {
      const { user, cleanup } = await generateRealTestUser()
      cleanups.push(cleanup)

      const visible = await insertChallenge({})
      const unreleased = await insertChallenge({
        releaseTime: Date.now() + 60 * 60 * 1000,
      })

      await insertSolve(visible.id, user.id)
      await insertSolve(unreleased.id, user.id)

      const res = await request(app, `/api/v1/users/${user.id}`, {
        method: 'GET',
      })

      const body = await expectResponse(res, GoodUserData)
      const solveIds = body.data.solves.map((s: any) => s.id)
      expect(solveIds).toContain(visible.id)
      expect(solveIds).not.toContain(unreleased.id)
    })
  })

  describe('challenge solves endpoint rejects non-public challenges', () => {
    test('hidden challenge returns badChallenge on /api/v1/challs/:id/solves', async () => {
      const hidden = await insertChallenge({ hidden: true })

      const res = await request(
        app,
        `/api/v1/challs/${encodeURIComponent(hidden.id)}/solves?limit=10&offset=0`,
        { method: 'GET' }
      )

      await expectResponse(res, BadChallenge)
    })

    test('unreleased challenge returns badChallenge on /api/v1/challs/:id/solves', async () => {
      const unreleased = await insertChallenge({
        releaseTime: Date.now() + 60 * 60 * 1000,
      })

      const res = await request(
        app,
        `/api/v1/challs/${encodeURIComponent(unreleased.id)}/solves?limit=10&offset=0`,
        { method: 'GET' }
      )

      await expectResponse(res, BadChallenge)
    })

    test('hidden challenge returns badChallenge on /api/v2/challs/:id/solves', async () => {
      const hidden = await insertChallenge({ hidden: true })

      const res = await request(
        app,
        `/api/v2/challs/${encodeURIComponent(hidden.id)}/solves?limit=10&offset=0`,
        { method: 'GET' }
      )

      await expectResponse(res, BadChallenge)
    })

    test('unreleased challenge returns badChallenge on /api/v2/challs/:id/solves', async () => {
      const unreleased = await insertChallenge({
        releaseTime: Date.now() + 60 * 60 * 1000,
      })

      const res = await request(
        app,
        `/api/v2/challs/${encodeURIComponent(unreleased.id)}/solves?limit=10&offset=0`,
        { method: 'GET' }
      )

      await expectResponse(res, BadChallenge)
    })

    test('visible challenge succeeds on /api/v1/challs/:id/solves', async () => {
      const visible = await insertChallenge({})

      const res = await request(
        app,
        `/api/v1/challs/${encodeURIComponent(visible.id)}/solves?limit=10&offset=0`,
        { method: 'GET' }
      )

      await expectResponse(res, GoodChallengeSolves)
    })

    test('visible challenge succeeds on /api/v2/challs/:id/solves', async () => {
      const visible = await insertChallenge({})

      const res = await request(
        app,
        `/api/v2/challs/${encodeURIComponent(visible.id)}/solves?limit=10&offset=0`,
        { method: 'GET' }
      )

      await expectResponse(res, GoodChallengeSolvesV2)
    })
  })

  describe('leaderboard excludes non-public challenges', () => {
    test('hidden challenge is excluded from leaderboard calculation', async () => {
      const { user, cleanup } = await generateRealTestUser()
      cleanups.push(cleanup)

      const visible = await insertChallenge({})
      const hidden = await insertChallenge({ hidden: true })

      await insertSolve(visible.id, user.id)
      await insertSolve(hidden.id, user.id)

      const db = getDb()
      const result = await calculateLeaderboard(db)

      expect(result.challengeInfos.has(visible.id)).toBe(true)
      expect(result.challengeInfos.has(hidden.id)).toBe(false)

      const leaderboardUser = result.users.find(u => u.id === user.id)
      expect(leaderboardUser).toBeDefined()
      const visibleChallInfo = result.challengeInfos.get(visible.id)
      expect(leaderboardUser!.score).toBe(visibleChallInfo!.score)
    })

    test('unreleased challenge is excluded from leaderboard calculation', async () => {
      const { user, cleanup } = await generateRealTestUser()
      cleanups.push(cleanup)

      const visible = await insertChallenge({})
      const unreleased = await insertChallenge({
        releaseTime: Date.now() + 60 * 60 * 1000,
      })

      await insertSolve(visible.id, user.id)
      await insertSolve(unreleased.id, user.id)

      const db = getDb()
      const result = await calculateLeaderboard(db)

      expect(result.challengeInfos.has(visible.id)).toBe(true)
      expect(result.challengeInfos.has(unreleased.id)).toBe(false)

      const leaderboardUser = result.users.find(u => u.id === user.id)
      expect(leaderboardUser).toBeDefined()
      const visibleChallInfo = result.challengeInfos.get(visible.id)
      expect(leaderboardUser!.score).toBe(visibleChallInfo!.score)
    })

    test('hidden challenge with past releaseTime is excluded from leaderboard', async () => {
      const { user, cleanup } = await generateRealTestUser()
      cleanups.push(cleanup)

      const visible = await insertChallenge({})
      const hiddenPast = await insertChallenge({
        hidden: true,
        releaseTime: Date.now() - 60 * 60 * 1000,
      })

      await insertSolve(visible.id, user.id)
      await insertSolve(hiddenPast.id, user.id)

      const db = getDb()
      const result = await calculateLeaderboard(db)

      expect(result.challengeInfos.has(visible.id)).toBe(true)
      expect(result.challengeInfos.has(hiddenPast.id)).toBe(false)
    })
  })
})
