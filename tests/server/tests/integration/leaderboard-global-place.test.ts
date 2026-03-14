import { config } from '@rctf/config'
import {
  challenges,
  createDatabase,
  solves,
  users,
  type ChallengeData,
} from '@rctf/db'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import {
  cacheLeaderboardAndGraph,
  getLeaderboard,
  getLeaderboardWithGlobalScores,
} from '../../../../apps/api/src/cache/leaderboard'
import {
  calculateLeaderboard,
  getLeaderboardWithTotal,
} from '../../../../apps/api/src/services/leaderboard'
import { createRedis } from '../../../../apps/api/src/util/redis'
import { clearDatabase } from '../../util'

const getDb = () => createDatabase(config.database.sql).db

const cleanups: Array<() => Promise<void>> = []

beforeEach(clearDatabase)

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map(fn => fn()))
})

const insertUser = async (
  name: string = crypto.randomUUID(),
  overrides?: { division?: string }
) => {
  const db = getDb()
  const id = crypto.randomUUID()

  await db.insert(users).values({
    id,
    name,
    email: `${crypto.randomUUID()}@example.com`,
    division: overrides?.division ?? Object.keys(config.divisions)[0]!,
    perms: 0,
  })

  cleanups.push(async () => {
    await db.delete(solves).where(eq(solves.userid, id))
    await db.delete(users).where(eq(users.id, id))
  })

  return { id, name }
}

const insertChallenge = async (overrides?: Partial<ChallengeData>) => {
  const db = getDb()
  const id = crypto.randomUUID()

  const data: ChallengeData = {
    name: crypto.randomUUID(),
    description: crypto.randomUUID(),
    category: crypto.randomUUID(),
    author: crypto.randomUUID(),
    files: [],
    flag: crypto.randomUUID(),
    tiebreakEligible: true,
    points: {
      min: 100,
      max: 500,
    },
    ...overrides,
  }

  await db.insert(challenges).values({ id, data })
  cleanups.push(async () => {
    await db.delete(solves).where(eq(solves.challengeid, id))
    await db.delete(challenges).where(eq(challenges.id, id))
  })

  return { id, data }
}

const T0 = config.startTime + 1_800_000 * 2
const T1 = T0 + 1000
const T2 = T0 + 2000
const T3 = T0 + 3000
const isoAt = (ms: number) => new Date(ms).toISOString()

const insertSolve = async (params: {
  challengeId: string
  userId: string
  createdAt?: string
}) => {
  const db = getDb()
  const id = crypto.randomUUID()

  await db.insert(solves).values({
    id,
    challengeid: params.challengeId,
    userid: params.userId,
    createdat: params.createdAt ?? new Date().toISOString(),
  })

  cleanups.push(async () => {
    await db.delete(solves).where(eq(solves.id, id))
  })

  return { id }
}

const computeAndCache = async () => {
  const db = getDb()
  const redis = await createRedis()
  const result = await calculateLeaderboard(db)
  await cacheLeaderboardAndGraph(redis, result)
  return { db, redis, result }
}

describe('getLeaderboardWithTotal globalPlace', () => {
  test('globalPlace equals position for global leaderboard (no division filter)', async () => {
    const divisions = Object.keys(config.divisions)
    const userA = await insertUser('top-scorer', { division: divisions[0] })
    const userB = await insertUser('mid-scorer', { division: divisions[1] })
    const ch1 = await insertChallenge({ points: { min: 100, max: 500 } })
    const ch2 = await insertChallenge({ points: { min: 100, max: 500 } })

    await insertSolve({
      challengeId: ch1.id,
      userId: userA.id,
      createdAt: isoAt(T0),
    })
    await insertSolve({
      challengeId: ch2.id,
      userId: userA.id,
      createdAt: isoAt(T1),
    })
    await insertSolve({
      challengeId: ch1.id,
      userId: userB.id,
      createdAt: isoAt(T2),
    })

    const { db, redis } = await computeAndCache()

    const result = await getLeaderboardWithTotal(redis, db, 10, 0)

    expect(result.leaderboard).toHaveLength(2)
    expect(result.leaderboard[0]!.globalPlace).toBe(1)
    expect(result.leaderboard[0]!.id).toBe(userA.id)
    expect(result.leaderboard[1]!.globalPlace).toBe(2)
    expect(result.leaderboard[1]!.id).toBe(userB.id)
  })

  test('globalPlace reflects global ranking when filtering by division', async () => {
    const divisions = Object.keys(config.divisions)
    const userA = await insertUser('global-1st', { division: divisions[0] })
    const userB = await insertUser('global-2nd', { division: divisions[1] })
    const userC = await insertUser('global-3rd', { division: divisions[1] })
    const ch1 = await insertChallenge({ points: { min: 100, max: 500 } })
    const ch2 = await insertChallenge({ points: { min: 100, max: 500 } })

    await insertSolve({
      challengeId: ch1.id,
      userId: userA.id,
      createdAt: isoAt(T0),
    })
    await insertSolve({
      challengeId: ch2.id,
      userId: userA.id,
      createdAt: isoAt(T1),
    })
    await insertSolve({
      challengeId: ch1.id,
      userId: userB.id,
      createdAt: isoAt(T2),
    })
    await insertSolve({
      challengeId: ch1.id,
      userId: userC.id,
      createdAt: isoAt(T3),
    })

    const { db, redis } = await computeAndCache()
    const divResult = await getLeaderboardWithTotal(
      redis,
      db,
      10,
      0,
      divisions[1]
    )

    expect(divResult.leaderboard).toHaveLength(2)

    expect(divResult.leaderboard[0]!.divisionPlace).toBe(1)
    expect(divResult.leaderboard[1]!.divisionPlace).toBe(2)

    for (const entry of divResult.leaderboard) {
      expect(entry.globalPlace).not.toBe(1)
      expect(entry.globalPlace).toBeGreaterThanOrEqual(2)
    }
  })

  test('globalPlace is correct with offset for global leaderboard', async () => {
    const userA = await insertUser('first')
    const userB = await insertUser('second')
    const ch = await insertChallenge({ points: { min: 100, max: 500 } })

    await insertSolve({
      challengeId: ch.id,
      userId: userA.id,
      createdAt: isoAt(T0),
    })
    await insertSolve({
      challengeId: ch.id,
      userId: userB.id,
      createdAt: isoAt(T1),
    })

    const { db, redis } = await computeAndCache()
    const result = await getLeaderboardWithTotal(redis, db, 1, 1)

    expect(result.leaderboard).toHaveLength(1)
    expect(result.leaderboard[0]!.globalPlace).toBe(2)
  })

  test('globalPlace is null for users not yet in score-positions cache', async () => {
    const divisions = Object.keys(config.divisions)
    const redis = await createRedis()
    const db = getDb()

    const emptyResult = await calculateLeaderboard(db)
    await cacheLeaderboardAndGraph(redis, emptyResult)

    const user = await insertUser('lonely', { division: divisions[0] })
    const ch = await insertChallenge()
    await insertSolve({
      challengeId: ch.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })

    const result = await calculateLeaderboard(db)
    await cacheLeaderboardAndGraph(redis, result)

    const divResult = await getLeaderboardWithTotal(
      redis,
      db,
      10,
      0,
      divisions[0]
    )

    expect(divResult.leaderboard).toHaveLength(1)
    expect(divResult.leaderboard[0]!.id).toBe(user.id)
    expect(divResult.leaderboard[0]!.globalPlace).toBe(1)
  })

  test('response includes solves, avatarUrl, countryCode, and statusText alongside globalPlace', async () => {
    const user = await insertUser('full-user')
    const ch = await insertChallenge()

    await insertSolve({
      challengeId: ch.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })

    const { db, redis } = await computeAndCache()
    const result = await getLeaderboardWithTotal(redis, db, 10, 0)

    const entry = result.leaderboard[0]!
    expect(entry.globalPlace).toBe(1)
    expect(entry.solves).toHaveLength(1)
    expect(entry.solves[0]!.id).toBe(ch.id)
    expect(entry).toHaveProperty('avatarUrl')
    expect(entry).toHaveProperty('countryCode')
    expect(entry).toHaveProperty('statusText')
  })
})

describe('getLeaderboardWithGlobalScores cache layer', () => {
  test('returns leaderboard and globalScores in a single Redis call', async () => {
    const divisions = Object.keys(config.divisions)
    const userA = await insertUser('alpha', { division: divisions[0] })
    const userB = await insertUser('beta', { division: divisions[0] })
    const ch = await insertChallenge({ points: { min: 100, max: 500 } })

    await insertSolve({
      challengeId: ch.id,
      userId: userA.id,
      createdAt: isoAt(T0),
    })
    await insertSolve({
      challengeId: ch.id,
      userId: userB.id,
      createdAt: isoAt(T1),
    })

    const redis = await createRedis()
    const db = getDb()
    const calculated = await calculateLeaderboard(db)
    await cacheLeaderboardAndGraph(redis, calculated)

    const combined = await getLeaderboardWithGlobalScores(
      redis,
      10,
      0,
      divisions[0]!
    )

    expect(combined.leaderboard).toHaveLength(2)
    expect(combined.globalScores.size).toBe(2)

    const separate = await getLeaderboard(redis, 10, 0, divisions[0])

    expect(combined.leaderboard).toEqual(separate.leaderboard)
    expect(combined.total).toBe(separate.total)

    for (const entry of combined.leaderboard) {
      const score = combined.globalScores.get(entry.id)
      expect(score).toBeDefined()
      expect(score!.place).toBeGreaterThanOrEqual(1)
    }
  })

  test('produces same globalPlace as separate getUsersScores call', async () => {
    const divisions = Object.keys(config.divisions)
    const userA = await insertUser('compare-a', { division: divisions[0] })
    const userB = await insertUser('compare-b', { division: divisions[1] })
    const userC = await insertUser('compare-c', { division: divisions[0] })
    const ch1 = await insertChallenge({ points: { min: 100, max: 500 } })
    const ch2 = await insertChallenge({ points: { min: 50, max: 300 } })

    await insertSolve({
      challengeId: ch1.id,
      userId: userA.id,
      createdAt: isoAt(T0),
    })
    await insertSolve({
      challengeId: ch2.id,
      userId: userA.id,
      createdAt: isoAt(T1),
    })
    await insertSolve({
      challengeId: ch1.id,
      userId: userB.id,
      createdAt: isoAt(T2),
    })
    await insertSolve({
      challengeId: ch1.id,
      userId: userC.id,
      createdAt: isoAt(T3),
    })

    const redis = await createRedis()
    const db = getDb()
    const calculated = await calculateLeaderboard(db)
    await cacheLeaderboardAndGraph(redis, calculated)

    const withDivision = await getLeaderboardWithTotal(
      redis,
      db,
      10,
      0,
      divisions[0]
    )

    const global = await getLeaderboardWithTotal(redis, db, 10, 0)

    for (const divEntry of withDivision.leaderboard) {
      const globalIdx = global.leaderboard.findIndex(e => e.id === divEntry.id)
      expect(globalIdx).not.toBe(-1)
      expect(divEntry.globalPlace).toBe(
        global.leaderboard[globalIdx]!.globalPlace
      )
    }
  })

  test('empty division returns empty globalScores', async () => {
    const divisions = Object.keys(config.divisions)
    const emptyDivision = divisions[2] ?? divisions[1]!

    const redis = await createRedis()
    const db = getDb()
    const calculated = await calculateLeaderboard(db)
    await cacheLeaderboardAndGraph(redis, calculated)

    const result = await getLeaderboardWithGlobalScores(
      redis,
      10,
      0,
      emptyDivision
    )

    expect(result.leaderboard).toHaveLength(0)
    expect(result.globalScores.size).toBe(0)
    expect(result.total).toBe(0)
  })
})
