import { config } from '@rctf/config'
import { createDatabase, solves, users } from '@rctf/db'
import {
  GoodFlag,
  GoodLeaderboardChallengesV2,
  GoodLeaderboardV2,
  Permissions,
} from '@rctf/types'
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
  await cacheLeaderboardAndGraph(db, redis, result)
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
    expect(entry.score).toBe(500)
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
    expect(globalA.score).toBe(981)
    expect(globalB.score).toBe(481)
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
    expect(r2b.score).toBe(981)
    expect(r2a.score).toBe(481)
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

describe('first bloods via leaderboard challenges endpoint', () => {
  const cleanups: Array<() => Promise<void>> = []

  beforeEach(clearDatabase)

  afterEach(async () => {
    await Promise.all(cleanups.splice(0).map(fn => fn()))
    await recomputeLeaderboard()
  })

  test('returns first 3 solvers per challenge in correct order', async () => {
    const ch = await generateChallenge()
    cleanups.push(ch.cleanup)

    const solvers = []
    for (let i = 0; i < 4; i++) {
      const { user, cleanup } = await generateRealTestUser()
      cleanups.push(cleanup)
      solvers.push(user)
    }

    for (const solver of solvers) {
      const token = await createToken(TokenKind.Auth, solver.id)
      await expectResponse(
        await submitFlag(ch.challenge.id, ch.challenge.flag, token),
        GoodFlag
      )
    }

    await recomputeLeaderboard()

    const res = await request(app, '/api/v2/leaderboard/challs', {
      method: 'GET',
    })
    const body = await expectResponse(res, GoodLeaderboardChallengesV2)

    const challData = body.data.challenges[ch.challenge.id]
    expect(challData).toBeDefined()
    expect(challData.firstSolvers).toHaveLength(3)
    expect(challData.firstSolvers[0].id).toBe(solvers[0]!.id)
    expect(challData.firstSolvers[1].id).toBe(solvers[1]!.id)
    expect(challData.firstSolvers[2].id).toBe(solvers[2]!.id)
  })

  test('excludes banned users from first solvers', async () => {
    const db = getDb()
    const ch = await generateChallenge()
    cleanups.push(ch.cleanup)

    const { user: bannedUser, cleanup: bannedCleanup } =
      await generateRealTestUser()
    const { user: activeUser, cleanup: activeCleanup } =
      await generateRealTestUser()
    cleanups.push(bannedCleanup, activeCleanup)

    await db.insert(solves).values([
      {
        id: crypto.randomUUID(),
        challengeid: ch.challenge.id,
        userid: bannedUser.id,
        createdat: new Date(config.startTime + 1000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        challengeid: ch.challenge.id,
        userid: activeUser.id,
        createdat: new Date(config.startTime + 2000).toISOString(),
      },
    ])

    await db
      .update(users)
      .set({ banned: true })
      .where(eq(users.id, bannedUser.id))

    await recomputeLeaderboard()

    const res = await request(app, '/api/v2/leaderboard/challs', {
      method: 'GET',
    })
    const body = await expectResponse(res, GoodLeaderboardChallengesV2)

    const challData = body.data.challenges[ch.challenge.id]
    expect(challData).toBeDefined()
    expect(challData.solves).toBe(1)
    expect(challData.firstSolvers.map((solver: any) => solver.id)).toEqual([
      activeUser.id,
    ])
  })

  test('returns fewer than 3 solvers when challenge has fewer solves', async () => {
    const ch = await generateChallenge()
    cleanups.push(ch.cleanup)

    const { user, cleanup } = await generateRealTestUser()
    cleanups.push(cleanup)

    const token = await createToken(TokenKind.Auth, user.id)
    await expectResponse(
      await submitFlag(ch.challenge.id, ch.challenge.flag, token),
      GoodFlag
    )

    await recomputeLeaderboard()

    const res = await request(app, '/api/v2/leaderboard/challs', {
      method: 'GET',
    })
    const body = await expectResponse(res, GoodLeaderboardChallengesV2)

    const challData = body.data.challenges[ch.challenge.id]
    expect(challData).toBeDefined()
    expect(challData.firstSolvers).toHaveLength(1)
    expect(challData.firstSolvers[0].id).toBe(user.id)
  })

  test('uses solve id as a deterministic tiebreaker for same-timestamp first bloods', async () => {
    const db = getDb()
    const ch = await generateChallenge()
    cleanups.push(ch.cleanup)

    const solverIds: string[] = []
    for (let i = 0; i < 3; i++) {
      const { user, cleanup } = await generateRealTestUser()
      cleanups.push(cleanup)
      solverIds.push(user.id)
    }

    const createdAt = new Date().toISOString()
    await db.insert(solves).values([
      {
        id: '00000000-0000-0000-0000-000000000002',
        challengeid: ch.challenge.id,
        userid: solverIds[1]!,
        createdat: createdAt,
      },
      {
        id: '00000000-0000-0000-0000-000000000001',
        challengeid: ch.challenge.id,
        userid: solverIds[0]!,
        createdat: createdAt,
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        challengeid: ch.challenge.id,
        userid: solverIds[2]!,
        createdat: createdAt,
      },
    ])

    await recomputeLeaderboard()

    const res = await request(app, '/api/v2/leaderboard/challs', {
      method: 'GET',
    })
    const body = await expectResponse(res, GoodLeaderboardChallengesV2)

    const challData = body.data.challenges[ch.challenge.id]
    expect(challData).toBeDefined()
    expect(challData.firstSolvers.map((solver: any) => solver.id)).toEqual(
      solverIds
    )
  })

  test('returns correct score and solve count', async () => {
    const ch = await generateChallenge()
    cleanups.push(ch.cleanup)

    const { user, cleanup } = await generateRealTestUser()
    cleanups.push(cleanup)

    const token = await createToken(TokenKind.Auth, user.id)
    await expectResponse(
      await submitFlag(ch.challenge.id, ch.challenge.flag, token),
      GoodFlag
    )

    await recomputeLeaderboard()

    const res = await request(app, '/api/v2/leaderboard/challs', {
      method: 'GET',
    })
    const body = await expectResponse(res, GoodLeaderboardChallengesV2)

    const challData = body.data.challenges[ch.challenge.id]
    expect(challData.solves).toBe(1)
    expect(challData.points).toBe(500)
    expect(challData.name).toBe(ch.challenge.name)
    expect(challData.category).toBe(ch.challenge.category)
  })

  test('unsolved challenge has empty firstSolvers', async () => {
    const ch = await generateChallenge()
    cleanups.push(ch.cleanup)

    await recomputeLeaderboard()

    const res = await request(app, '/api/v2/leaderboard/challs', {
      method: 'GET',
    })
    const body = await expectResponse(res, GoodLeaderboardChallengesV2)

    const challData = body.data.challenges[ch.challenge.id]
    expect(challData).toBeDefined()
    expect(challData.firstSolvers).toHaveLength(0)
    expect(challData.solves).toBe(0)
  })
})

describe('CTFtime leaderboard endpoint', () => {
  const cleanups: Array<() => Promise<void>> = []

  beforeEach(clearDatabase)

  afterEach(async () => {
    await Promise.all(cleanups.splice(0).map(fn => fn()))
    await recomputeLeaderboard()
  })

  test('returns standings in CTFtime format with correct ordering', async () => {
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
      await submitFlag(ch2.challenge.id, ch2.challenge.flag, tokenA),
      GoodFlag
    )
    await expectResponse(
      await submitFlag(ch1.challenge.id, ch1.challenge.flag, tokenB),
      GoodFlag
    )

    await recomputeLeaderboard()

    const db = getDb()
    const adminId = crypto.randomUUID()
    await db.insert(users).values({
      id: adminId,
      name: `ctftime-admin-${crypto.randomUUID()}`,
      email: `${crypto.randomUUID()}@test.com`,
      division: Object.keys(config.divisions)[0]!,
      perms: Permissions.leaderboardRead,
    })
    cleanups.push(async () => {
      await db.delete(users).where(eq(users.id, adminId))
    })
    const adminToken = await createToken(TokenKind.Auth, adminId)

    const res = await request(app, '/api/v1/integrations/ctftime/leaderboard', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.standings.length).toBe(2)
    expect(body.standings[0].pos).toBe(1)
    expect(body.standings[0].team).toBe(userA.name)
    expect(body.standings[0].score).toBe(981)
    expect(body.standings[1].score).toBe(481)
    expect(body.standings[1].pos).toBe(2)
    expect(body.standings[1].team).toBe(userB.name)

    for (let i = 0; i < body.standings.length; i++) {
      expect(body.standings[i].pos).toBe(i + 1)
    }
  })

  test('excludes unranked users from CTFtime standings', async () => {
    const { user: unranked, cleanup } = await generateRealTestUser()
    cleanups.push(cleanup)

    await recomputeLeaderboard()

    const db = getDb()
    const adminId = crypto.randomUUID()
    await db.insert(users).values({
      id: adminId,
      name: `ctftime-admin2-${crypto.randomUUID()}`,
      email: `${crypto.randomUUID()}@test.com`,
      division: Object.keys(config.divisions)[0]!,
      perms: Permissions.leaderboardRead,
    })
    cleanups.push(async () => {
      await db.delete(users).where(eq(users.id, adminId))
    })
    const adminToken = await createToken(TokenKind.Auth, adminId)

    const res = await request(app, '/api/v1/integrations/ctftime/leaderboard', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()

    const teams = body.standings.map((s: any) => s.team)
    expect(teams).not.toContain(unranked.name)
  })

  test('excludes banned users from CTFtime standings even with stale cached ranks', async () => {
    const ch = await generateChallenge()
    cleanups.push(ch.cleanup)

    const { user: bannedUser, cleanup: bannedCleanup } =
      await generateRealTestUser()
    const { user: activeUser, cleanup: activeCleanup } =
      await generateRealTestUser()
    cleanups.push(bannedCleanup, activeCleanup)

    const db = getDb()
    await db.insert(solves).values([
      {
        id: crypto.randomUUID(),
        challengeid: ch.challenge.id,
        userid: bannedUser.id,
        createdat: new Date(config.startTime + 1000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        challengeid: ch.challenge.id,
        userid: activeUser.id,
        createdat: new Date(config.startTime + 2000).toISOString(),
      },
    ])

    await recomputeLeaderboard()

    const before = await db
      .select({ globalRank: users.globalRank })
      .from(users)
      .where(eq(users.id, bannedUser.id))
    expect(before[0]!.globalRank).not.toBeNull()

    await db
      .update(users)
      .set({ banned: true })
      .where(eq(users.id, bannedUser.id))

    const adminId = crypto.randomUUID()
    await db.insert(users).values({
      id: adminId,
      name: `ctftime-admin3-${crypto.randomUUID()}`,
      email: `${crypto.randomUUID()}@test.com`,
      division: Object.keys(config.divisions)[0]!,
      perms: Permissions.leaderboardRead,
    })
    cleanups.push(async () => {
      await db.delete(users).where(eq(users.id, adminId))
    })
    const adminToken = await createToken(TokenKind.Auth, adminId)

    const res = await request(app, '/api/v1/integrations/ctftime/leaderboard', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()

    const teams = body.standings.map((s: any) => s.team)
    expect(teams).toContain(activeUser.name)
    expect(teams).not.toContain(bannedUser.name)
  })
})
