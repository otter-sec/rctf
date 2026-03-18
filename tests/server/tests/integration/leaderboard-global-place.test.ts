import { config } from '@rctf/config'
import {
  challenges,
  createDatabase,
  solves,
  users,
  type ChallengeData,
} from '@rctf/db'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import {
  cacheLeaderboardAndGraph,
  getGraph,
} from '../../../../apps/api/src/cache/leaderboard'
import { getFullUser } from '../../../../apps/api/src/services/full-user'
import {
  calculateLeaderboard,
  getLeaderboardWithTotal,
  searchLeaderboard,
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
  await cacheLeaderboardAndGraph(db, redis, result)
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

    const { db } = await computeAndCache()
    const result = await getLeaderboardWithTotal(db, 10, 0)

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

    const { db } = await computeAndCache()
    const divResult = await getLeaderboardWithTotal(db, 10, 0, divisions[1])

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

    const { db } = await computeAndCache()
    const result = await getLeaderboardWithTotal(db, 1, 1)

    expect(result.leaderboard).toHaveLength(1)
    expect(result.leaderboard[0]!.globalPlace).toBe(2)
  })

  test('globalPlace is set after compute and cache', async () => {
    const divisions = Object.keys(config.divisions)
    const db = getDb()
    const redis = await createRedis()

    const emptyResult = await calculateLeaderboard(db)
    await cacheLeaderboardAndGraph(db, redis, emptyResult)

    const user = await insertUser('lonely', { division: divisions[0] })
    const ch = await insertChallenge()
    await insertSolve({
      challengeId: ch.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })

    const result = await calculateLeaderboard(db)
    await cacheLeaderboardAndGraph(db, redis, result)

    const divResult = await getLeaderboardWithTotal(db, 10, 0, divisions[0])

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

    const { db } = await computeAndCache()
    const result = await getLeaderboardWithTotal(db, 10, 0)

    const entry = result.leaderboard[0]!
    expect(entry.globalPlace).toBe(1)
    expect(entry.solves).toHaveLength(1)
    expect(entry.solves[0]!.id).toBe(ch.id)
    expect(entry).toHaveProperty('avatarUrl')
    expect(entry).toHaveProperty('countryCode')
    expect(entry).toHaveProperty('statusText')
  })

  test('division leaderboard shows correct global and division ranks', async () => {
    const divisions = Object.keys(config.divisions)
    const userA = await insertUser('alpha', { division: divisions[0] })
    const userB = await insertUser('beta', { division: divisions[0] })
    const userC = await insertUser('gamma', { division: divisions[1] })
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

    const { db } = await computeAndCache()

    const withDivision = await getLeaderboardWithTotal(db, 10, 0, divisions[0])

    const global = await getLeaderboardWithTotal(db, 10, 0)

    for (const divEntry of withDivision.leaderboard) {
      const globalIdx = global.leaderboard.findIndex(e => e.id === divEntry.id)
      expect(globalIdx).not.toBe(-1)
      expect(divEntry.globalPlace).toBe(
        global.leaderboard[globalIdx]!.globalPlace
      )
    }
  })
})

describe('zero-score teams with valid solves', () => {
  test('team that solved a zero-point challenge appears on the leaderboard', async () => {
    const divisions = Object.keys(config.divisions)
    const user = await insertUser('zero-scorer', { division: divisions[0] })
    const ch = await insertChallenge({
      points: { min: 0, max: 0 },
    })

    await insertSolve({
      challengeId: ch.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })

    const { db } = await computeAndCache()

    const result = await getLeaderboardWithTotal(db, 10, 0)
    expect(result.leaderboard.find(e => e.id === user.id)).toBeDefined()
    expect(result.total).toBeGreaterThanOrEqual(1)
  })

  test('team that solved a zero-point challenge appears in search results', async () => {
    const divisions = Object.keys(config.divisions)
    const user = await insertUser('zero-search-test', {
      division: divisions[0],
    })
    const ch = await insertChallenge({
      points: { min: 0, max: 0 },
    })

    await insertSolve({
      challengeId: ch.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })

    const { db } = await computeAndCache()

    const result = await searchLeaderboard(db, 'zero-search-test', 10, 0)
    expect(result.leaderboard.find(e => e.id === user.id)).toBeDefined()
  })

  test('team that solved a zero-point challenge appears in graph', async () => {
    const divisions = Object.keys(config.divisions)
    const user = await insertUser('zero-graph-test', { division: divisions[0] })
    const ch = await insertChallenge({
      points: { min: 0, max: 0 },
    })

    await insertSolve({
      challengeId: ch.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })

    const { db, redis } = await computeAndCache()

    const graph = await getGraph(db, redis, 10, 0)
    expect(graph.find(e => e.id === user.id)).toBeDefined()
  })

  test('stale ranks are cleared when a zero-point challenge is hidden', async () => {
    const divisions = Object.keys(config.divisions)
    const user = await insertUser('stale-rank', { division: divisions[0] })
    const ch = await insertChallenge({
      points: { min: 0, max: 0 },
    })

    await insertSolve({
      challengeId: ch.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })

    const { db, redis } = await computeAndCache()
    const before = await getLeaderboardWithTotal(db, 10, 0)
    expect(before.leaderboard.find(e => e.id === user.id)).toBeDefined()

    await db
      .update(challenges)
      .set({
        data: { ...ch.data, hidden: true },
      })
      .where(eq(challenges.id, ch.id))

    const result = await calculateLeaderboard(db)
    await cacheLeaderboardAndGraph(db, redis, result)

    const after = await getLeaderboardWithTotal(db, 10, 0)
    expect(after.leaderboard.find(e => e.id === user.id)).toBeUndefined()

    const dbUser = await db
      .select({
        globalRank: users.globalRank,
        divisionRank: users.divisionRank,
      })
      .from(users)
      .where(eq(users.id, user.id))

    expect(dbUser[0]!.globalRank).toBeNull()
    expect(dbUser[0]!.divisionRank).toBeNull()
  })
})

describe('challenge score/solve_count caching', () => {
  test('challenge score and solve_count are persisted after cacheLeaderboardAndGraph', async () => {
    const user1 = await insertUser('scorer-1')
    const user2 = await insertUser('scorer-2')
    const ch = await insertChallenge({ points: { min: 100, max: 500 } })

    await insertSolve({
      challengeId: ch.id,
      userId: user1.id,
      createdAt: isoAt(T0),
    })
    await insertSolve({
      challengeId: ch.id,
      userId: user2.id,
      createdAt: isoAt(T1),
    })

    const { db } = await computeAndCache()

    const dbChall = await db
      .select({ score: challenges.score, solveCount: challenges.solveCount })
      .from(challenges)
      .where(eq(challenges.id, ch.id))

    expect(dbChall[0]!.solveCount).toBe(2)
    expect(dbChall[0]!.score).toBeGreaterThan(0)
  })

  test('stale challenge score/solve_count is reset when challenge is hidden', async () => {
    const user = await insertUser('stale-chall-user')
    const ch = await insertChallenge({ points: { min: 100, max: 500 } })

    await insertSolve({
      challengeId: ch.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })

    const { db, redis } = await computeAndCache()

    const before = await db
      .select({ score: challenges.score, solveCount: challenges.solveCount })
      .from(challenges)
      .where(eq(challenges.id, ch.id))
    expect(before[0]!.solveCount).toBe(1)
    expect(before[0]!.score).toBeGreaterThan(0)

    await db
      .update(challenges)
      .set({ data: { ...ch.data, hidden: true } })
      .where(eq(challenges.id, ch.id))

    const result = await calculateLeaderboard(db)
    await cacheLeaderboardAndGraph(db, redis, result)

    const after = await db
      .select({ score: challenges.score, solveCount: challenges.solveCount })
      .from(challenges)
      .where(eq(challenges.id, ch.id))
    expect(after[0]!.score).toBe(0)
    expect(after[0]!.solveCount).toBe(0)
  })

  test('challenge score updates correctly across multiple recomputations', async () => {
    const user1 = await insertUser('multi-1')
    const user2 = await insertUser('multi-2')
    const ch = await insertChallenge({ points: { min: 100, max: 500 } })

    await insertSolve({
      challengeId: ch.id,
      userId: user1.id,
      createdAt: isoAt(T0),
    })

    const { db, redis } = await computeAndCache()

    const round1 = await db
      .select({ score: challenges.score, solveCount: challenges.solveCount })
      .from(challenges)
      .where(eq(challenges.id, ch.id))
    expect(round1[0]!.solveCount).toBe(1)
    const scoreAfterOneSolve = round1[0]!.score

    await insertSolve({
      challengeId: ch.id,
      userId: user2.id,
      createdAt: isoAt(T1),
    })

    const result2 = await calculateLeaderboard(db)
    await cacheLeaderboardAndGraph(db, redis, result2)

    const round2 = await db
      .select({ score: challenges.score, solveCount: challenges.solveCount })
      .from(challenges)
      .where(eq(challenges.id, ch.id))
    expect(round2[0]!.solveCount).toBe(2)
    expect(round2[0]!.score).toBeLessThanOrEqual(scoreAfterOneSolve)
  })
})

describe('cacheLeaderboard transaction correctness', () => {
  test('previously ranked user is unranked after losing all solves', async () => {
    const user = await insertUser('will-lose-rank')
    const ch = await insertChallenge({ points: { min: 100, max: 500 } })

    const solve = await insertSolve({
      challengeId: ch.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })

    const { db, redis } = await computeAndCache()

    const before = await db
      .select({ globalRank: users.globalRank, score: users.score })
      .from(users)
      .where(eq(users.id, user.id))
    expect(before[0]!.globalRank).not.toBeNull()
    expect(before[0]!.score).toBeGreaterThan(0)

    await db.delete(solves).where(eq(solves.id, solve.id))
    const result = await calculateLeaderboard(db)
    await cacheLeaderboardAndGraph(db, redis, result)

    const after = await db
      .select({
        globalRank: users.globalRank,
        divisionRank: users.divisionRank,
        score: users.score,
        lastSolveAt: users.lastSolveAt,
      })
      .from(users)
      .where(eq(users.id, user.id))
    expect(after[0]!.globalRank).toBeNull()
    expect(after[0]!.divisionRank).toBeNull()
    expect(after[0]!.score).toBe(0)
    expect(after[0]!.lastSolveAt).toBeNull()
  })

  test('stale user is cleared while other users remain ranked', async () => {
    const userKeep = await insertUser('keep-rank')
    const userLose = await insertUser('lose-rank')
    const ch = await insertChallenge({ points: { min: 100, max: 500 } })

    await insertSolve({
      challengeId: ch.id,
      userId: userKeep.id,
      createdAt: isoAt(T0),
    })
    const lostSolve = await insertSolve({
      challengeId: ch.id,
      userId: userLose.id,
      createdAt: isoAt(T1),
    })

    const { db, redis } = await computeAndCache()

    const beforeKeep = await db
      .select({ globalRank: users.globalRank, score: users.score })
      .from(users)
      .where(eq(users.id, userKeep.id))
    const beforeLose = await db
      .select({ globalRank: users.globalRank, score: users.score })
      .from(users)
      .where(eq(users.id, userLose.id))
    expect(beforeKeep[0]!.globalRank).not.toBeNull()
    expect(beforeLose[0]!.globalRank).not.toBeNull()

    await db.delete(solves).where(eq(solves.id, lostSolve.id))
    const result = await calculateLeaderboard(db)
    await cacheLeaderboardAndGraph(db, redis, result)

    const afterKeep = await db
      .select({ globalRank: users.globalRank, score: users.score })
      .from(users)
      .where(eq(users.id, userKeep.id))
    expect(afterKeep[0]!.globalRank).toBe(1)
    expect(afterKeep[0]!.score).toBeGreaterThan(0)

    const afterLose = await db
      .select({
        globalRank: users.globalRank,
        divisionRank: users.divisionRank,
        score: users.score,
      })
      .from(users)
      .where(eq(users.id, userLose.id))
    expect(afterLose[0]!.globalRank).toBeNull()
    expect(afterLose[0]!.divisionRank).toBeNull()
    expect(afterLose[0]!.score).toBe(0)
  })

  test('ranks are consistent after empty leaderboard recomputation', async () => {
    const db = getDb()
    const redis = await createRedis()

    const empty1 = await calculateLeaderboard(db)
    await cacheLeaderboardAndGraph(db, redis, empty1)

    const ranked = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`${users.globalRank} IS NOT NULL`)
    expect(ranked).toHaveLength(0)
  })

  test('user score and timestamps are set correctly', async () => {
    const user = await insertUser('ts-check')
    const ch = await insertChallenge({
      points: { min: 100, max: 500 },
      tiebreakEligible: true,
    })

    await insertSolve({
      challengeId: ch.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })

    const { db } = await computeAndCache()

    const row = await db
      .select({
        score: users.score,
        globalRank: users.globalRank,
        divisionRank: users.divisionRank,
        lastSolveAt: users.lastSolveAt,
        lastTiebreakSolveAt: users.lastTiebreakSolveAt,
      })
      .from(users)
      .where(eq(users.id, user.id))

    expect(row[0]!.score).toBeGreaterThan(0)
    expect(row[0]!.globalRank).toBe(1)
    expect(row[0]!.divisionRank).toBe(1)
    expect(row[0]!.lastSolveAt).not.toBeNull()
    expect(row[0]!.lastTiebreakSolveAt).not.toBeNull()
  })
})

describe('CTFtime leaderboard query', () => {
  test('returns ranked users in correct order with correct scores', async () => {
    const divisions = Object.keys(config.divisions)
    const user1 = await insertUser('ctftime-1', { division: divisions[0] })
    const user2 = await insertUser('ctftime-2', { division: divisions[0] })
    const ch1 = await insertChallenge({ points: { min: 100, max: 500 } })
    const ch2 = await insertChallenge({ points: { min: 100, max: 500 } })

    await insertSolve({
      challengeId: ch1.id,
      userId: user1.id,
      createdAt: isoAt(T0),
    })
    await insertSolve({
      challengeId: ch2.id,
      userId: user1.id,
      createdAt: isoAt(T1),
    })
    await insertSolve({
      challengeId: ch1.id,
      userId: user2.id,
      createdAt: isoAt(T2),
    })

    const { db } = await computeAndCache()

    const leaderboard = await db
      .select({ name: users.name, score: users.score })
      .from(users)
      .where(sql`${users.globalRank} IS NOT NULL`)
      .orderBy(
        sql`${users.score} DESC, ${users.lastTiebreakSolveAt} ASC NULLS LAST, ${users.lastSolveAt} ASC NULLS LAST`
      )

    expect(leaderboard.length).toBeGreaterThanOrEqual(2)
    expect(leaderboard[0]!.name).toBe(user1.name)
    expect(leaderboard[0]!.score).toBeGreaterThan(leaderboard[1]!.score!)
    const standings = leaderboard.map((item, index) => ({
      pos: index + 1,
      team: item.name,
      score: item.score ?? 0,
    }))
    expect(standings[0]!.pos).toBe(1)
    expect(standings[1]!.pos).toBe(2)
    expect(standings[0]!.score).toBeGreaterThan(0)
  })

  test('excludes unranked users', async () => {
    await insertUser('unranked-user')

    const { db } = await computeAndCache()

    const leaderboard = await db
      .select({ name: users.name })
      .from(users)
      .where(sql`${users.globalRank} IS NOT NULL`)

    const names = leaderboard.map(r => r.name)
    expect(names).not.toContain('unranked-user')
  })
})

describe('getFullUser reads fresh ranks from DB', () => {
  test('returns up-to-date score/rank even when user object is stale', async () => {
    const divisions = Object.keys(config.divisions)
    const user = await insertUser('stale-cache-user', {
      division: divisions[0],
    })
    const ch = await insertChallenge({ points: { min: 100, max: 500 } })

    await insertSolve({
      challengeId: ch.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })

    const { db } = await computeAndCache()

    const staleUser = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .then(rows => rows[0]!)

    const staleSnapshot = {
      ...staleUser,
      score: 0,
      globalRank: null,
      divisionRank: null,
    }

    const fullUser = await getFullUser(db, staleSnapshot as any)
    expect(fullUser.score).toBeGreaterThan(0)
    expect(fullUser.globalPlace).toBe(1)
    expect(fullUser.divisionPlace).toBe(1)
  })
})

describe('deterministic rank tiebreaker in leaderboard ordering', () => {
  test('leaderboard order matches assigned globalPlace when scores are identical', async () => {
    const divisions = Object.keys(config.divisions)
    const ch = await insertChallenge({ points: { min: 100, max: 500 } })

    const userA = await insertUser('tie-a', { division: divisions[0] })
    const userB = await insertUser('tie-b', { division: divisions[0] })

    await insertSolve({
      challengeId: ch.id,
      userId: userA.id,
      createdAt: isoAt(T0),
    })
    await insertSolve({
      challengeId: ch.id,
      userId: userB.id,
      createdAt: isoAt(T0), // exact same timestamp
    })

    const { db } = await computeAndCache()
    const result = await getLeaderboardWithTotal(db, 10, 0)

    expect(result.leaderboard).toHaveLength(2)

    for (const entry of result.leaderboard) {
      const idx = result.leaderboard.indexOf(entry)
      expect(entry.globalPlace).toBe(idx + 1)
    }
  })

  test('graph order matches leaderboard order for tied users', async () => {
    const divisions = Object.keys(config.divisions)
    const ch = await insertChallenge({ points: { min: 100, max: 500 } })

    const userA = await insertUser('graph-tie-a', { division: divisions[0] })
    const userB = await insertUser('graph-tie-b', { division: divisions[0] })

    await insertSolve({
      challengeId: ch.id,
      userId: userA.id,
      createdAt: isoAt(T0),
    })
    await insertSolve({
      challengeId: ch.id,
      userId: userB.id,
      createdAt: isoAt(T0),
    })

    const { db, redis } = await computeAndCache()

    const leaderboard = await getLeaderboardWithTotal(db, 10, 0)
    const graph = await getGraph(db, redis, 10, 0)

    expect(graph.map(e => e.id)).toEqual(leaderboard.leaderboard.map(e => e.id))
  })
})
