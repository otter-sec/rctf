import { config } from '@rctf/config'
import { createDatabase, users } from '@rctf/db'
import { GoodFlag, GoodLeaderboardV2 } from '@rctf/types'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'bun:test'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import { cacheLeaderboardAndGraph } from '../../../../apps/api/src/cache/leaderboard'
import { createToken, TokenKind } from '../../../../apps/api/src/lib/tokens'
import { calculateLeaderboard } from '../../../../apps/api/src/services/leaderboard'
import { createRedis } from '../../../../apps/api/src/util/redis'
import { getApp, request } from '../../app'
import {
  clearDatabase,
  expectResponse,
  generateChallenge,
  generateRealTestUser,
} from '../../util'

let app: Hono<any>

beforeAll(async () => {
  app = await getApp()
})

const getDb = () => createDatabase(config.database.sql).db

// the worker runs async in a separate thread, so tests call this directly
const recomputeLeaderboard = async () => {
  const db = getDb()
  const redis = await createRedis()
  const result = await calculateLeaderboard(db)
  await cacheLeaderboardAndGraph(redis, result)
}

const submitFlag = async (
  challengeId: string,
  flag: string,
  authToken: string
) => {
  return request(
    app,
    `/api/v1/challs/${encodeURIComponent(challengeId)}/submit`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ flag }),
    }
  )
}

const getLeaderboard = async (
  limit: number,
  offset: number,
  division?: string
) => {
  const url = division
    ? `/api/v2/leaderboard/now?limit=${limit}&offset=${offset}&division=${division}`
    : `/api/v2/leaderboard/now?limit=${limit}&offset=${offset}`
  const res = await request(app, url, { method: 'GET' })
  return expectResponse(res, GoodLeaderboardV2)
}

describe('submit flag → leaderboard e2e', () => {
  const cleanups: Array<() => Promise<void>> = []

  beforeEach(clearDatabase)

  afterEach(async () => {
    await Promise.all(cleanups.splice(0).map(fn => fn()))
    await recomputeLeaderboard()
  })

  test('single user submits flag and appears on leaderboard with correct score and globalPlace', async () => {
    const challenge = await generateChallenge()
    const { user, cleanup: userCleanup } = await generateRealTestUser()
    cleanups.push(userCleanup, challenge.cleanup)

    const authToken = await createToken(TokenKind.Auth, user.id)

    const submitRes = await submitFlag(
      challenge.challenge.id,
      challenge.challenge.flag,
      authToken
    )
    await expectResponse(submitRes, GoodFlag)
    await recomputeLeaderboard()

    const body = await getLeaderboard(100, 0)
    const entry = body.data.leaderboard.find((e: any) => e.id === user.id)

    expect(entry).toBeDefined()
    expect(entry.score).toBeGreaterThan(0)
    expect(entry.globalPlace).toBe(1)
    expect(entry.solves).toHaveLength(1)
    expect(entry.solves[0].id).toBe(challenge.challenge.id)
  })

  test('two users in different divisions have correct globalPlace and divisionPlace', async () => {
    const divisions = Object.keys(config.divisions)
    const db = getDb()

    const ch1 = await generateChallenge()
    const ch2 = await generateChallenge()
    cleanups.push(ch1.cleanup, ch2.cleanup)

    const { user: userA, cleanup: cleanupA } = await generateRealTestUser()
    await db
      .update(users)
      .set({ division: divisions[0] })
      .where(eq(users.id, userA.id))
    cleanups.push(cleanupA)
    const tokenA = await createToken(TokenKind.Auth, userA.id)

    const { user: userB, cleanup: cleanupB } = await generateRealTestUser()
    await db
      .update(users)
      .set({ division: divisions[1] })
      .where(eq(users.id, userB.id))
    cleanups.push(cleanupB)
    const tokenB = await createToken(TokenKind.Auth, userB.id)

    await expectResponse(
      await submitFlag(ch1.challenge.id, ch1.challenge.flag, tokenA),
      GoodFlag
    )
    await expectResponse(
      await submitFlag(ch2.challenge.id, ch2.challenge.flag, tokenA),
      GoodFlag
    )
    await expectResponse(
      await submitFlag(ch1.challenge.id, ch1.challenge.flag, tokenB),
      GoodFlag
    )

    await recomputeLeaderboard()

    const global = await getLeaderboard(100, 0)
    const globalA = global.data.leaderboard.find((e: any) => e.id === userA.id)
    const globalB = global.data.leaderboard.find((e: any) => e.id === userB.id)

    expect(globalA).toBeDefined()
    expect(globalB).toBeDefined()
    expect(globalA.score).toBeGreaterThan(globalB.score)
    expect(globalA.globalPlace).toBe(1)
    expect(globalB.globalPlace).toBe(2)
    expect(globalA.solves).toHaveLength(2)
    expect(globalB.solves).toHaveLength(1)

    const divBoard = await getLeaderboard(100, 0, divisions[1])
    expect(divBoard.data.leaderboard).toHaveLength(1)

    const divEntry = divBoard.data.leaderboard[0]
    expect(divEntry.id).toBe(userB.id)
    expect(divEntry.divisionPlace).toBe(1)
    expect(divEntry.globalPlace).toBe(2)
  })

  test('leaderboard updates after additional solves', async () => {
    const ch1 = await generateChallenge()
    const ch2 = await generateChallenge()
    cleanups.push(ch1.cleanup, ch2.cleanup)

    const { user: userA, cleanup: cleanupA } = await generateRealTestUser()
    const { user: userB, cleanup: cleanupB } = await generateRealTestUser()
    cleanups.push(cleanupA, cleanupB)

    const tokenA = await createToken(TokenKind.Auth, userA.id)
    const tokenB = await createToken(TokenKind.Auth, userB.id)

    await expectResponse(
      await submitFlag(ch1.challenge.id, ch1.challenge.flag, tokenA),
      GoodFlag
    )
    await expectResponse(
      await submitFlag(ch1.challenge.id, ch1.challenge.flag, tokenB),
      GoodFlag
    )

    await recomputeLeaderboard()

    const round1 = await getLeaderboard(100, 0)
    const r1a = round1.data.leaderboard.find((e: any) => e.id === userA.id)
    const r1b = round1.data.leaderboard.find((e: any) => e.id === userB.id)
    expect(r1a.score).toBe(r1b.score)

    await expectResponse(
      await submitFlag(ch2.challenge.id, ch2.challenge.flag, tokenB),
      GoodFlag
    )

    await recomputeLeaderboard()

    const round2 = await getLeaderboard(100, 0)
    const r2a = round2.data.leaderboard.find((e: any) => e.id === userA.id)
    const r2b = round2.data.leaderboard.find((e: any) => e.id === userB.id)
    expect(r2b.score).toBeGreaterThan(r2a.score)
    expect(r2b.globalPlace).toBe(1)
    expect(r2a.globalPlace).toBe(2)
    expect(r2b.solves).toHaveLength(2)
    expect(r2a.solves).toHaveLength(1)
  })

  test('leaderboard pagination with offset returns correct globalPlace', async () => {
    const ch = await generateChallenge()
    cleanups.push(ch.cleanup)

    const usersData = []
    for (let i = 0; i < 3; i++) {
      const { user, cleanup } = await generateRealTestUser()
      cleanups.push(cleanup)
      const token = await createToken(TokenKind.Auth, user.id)
      await expectResponse(
        await submitFlag(ch.challenge.id, ch.challenge.flag, token),
        GoodFlag
      )
      usersData.push(user)
    }

    await recomputeLeaderboard()

    const full = await getLeaderboard(100, 0)
    const page2 = await getLeaderboard(100, 1)

    expect(page2.data.leaderboard).toHaveLength(
      full.data.leaderboard.length - 1
    )

    for (let i = 0; i < page2.data.leaderboard.length; i++) {
      expect(page2.data.leaderboard[i].globalPlace).toBe(i + 2)
    }
  })
})
