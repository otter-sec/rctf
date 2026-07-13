import { config } from '@rctf/config'
import { challenges, createDatabase, scoreEvents, users } from '@rctf/db'
import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import {
  cacheLeaderboardAndGraph,
  type CalculatedLeaderboard,
} from '../../../../apps/api/src/cache/leaderboard'
import { createRedis } from '../../../../apps/api/src/util/redis'
import { clearDatabase } from '../../util'

const getDb = () => createDatabase(config.database.sql).db

// enough scored users that the old per-row VALUES form
const SCALE = 15_000
const GRAPH_SAMPLE = Math.max(1000, config.leaderboard.graphSampleTime)
const T0 = config.startTime + 1_800_000 * 2
const T1 = T0 + GRAPH_SAMPLE
const bucketOf = (ms: number) => Math.ceil(ms / GRAPH_SAMPLE) * GRAPH_SAMPLE
const isoAt = (ms: number) => new Date(ms).toISOString()

const division = () => Object.keys(config.divisions)[0]!

const insertUser = async (name: string) => {
  const db = getDb()
  const id = crypto.randomUUID()

  await db.insert(users).values({
    id,
    name,
    email: `${crypto.randomUUID()}@example.com`,
    division: division(),
    perms: 0,
  })

  return { id, name }
}

const insertChallenge = async () => {
  const db = getDb()
  const id = crypto.randomUUID()

  await db.insert(challenges).values({
    id,
    data: {
      name: crypto.randomUUID(),
      description: crypto.randomUUID(),
      category: crypto.randomUUID(),
      author: crypto.randomUUID(),
      files: [],
      flag: crypto.randomUUID(),
      tiebreakEligible: true,
      points: { min: 100, max: 500 },
    },
  })

  return { id }
}

const insertScoreEvent = async (params: {
  challengeId: string
  userId: string
  pointsDelta: number
  eventAt: string
}) => {
  const db = getDb()
  const id = crypto.randomUUID()

  await db.insert(scoreEvents).values({
    id,
    challengeid: params.challengeId,
    userid: params.userId,
    pointsDelta: params.pointsDelta,
    eventAt: params.eventAt,
    source: 'flag',
  })

  return { id }
}

type LeaderboardUser = CalculatedLeaderboard['users'][number]

const buildBoard = (
  real: Array<{ id: string; name: string }>
): LeaderboardUser[] =>
  Array.from({ length: SCALE }, (_, i) => ({
    id: i < real.length ? real[i]!.id : `synthetic-${i}`,
    name: i < real.length ? real[i]!.name : `synthetic-${i}`,
    division: division(),
    score: SCALE - i,
    hadAnySolve: true,
    lastSolve: i === 0 ? T1 : undefined,
    lastTiebreakEligibleSolve: undefined,
  }))

const buildData = (
  boardUsers: LeaderboardUser[],
  challengeId: string,
  samples: CalculatedLeaderboard['samples'] = []
): CalculatedLeaderboard => ({
  users: boardUsers,
  challengeInfos: new Map([
    [
      challengeId,
      {
        score: 500,
        solves: 3,
        name: 'scale-challenge',
        category: 'misc',
        sortWeight: null,
      },
    ],
  ]),
  samples,
})

beforeEach(async () => {
  await clearDatabase()
  const db = getDb()
  await db.delete(scoreEvents)
  const redis = await createRedis()
  await redis.del(
    'graph-update',
    'graph-data',
    'graph-fingerprint',
    'graph-cursor',
    'graph-source'
  )
})

describe('leaderboard caching at scale', () => {
  test('caches leaderboard and graph with more users than the bind-parameter budget', async () => {
    const db = getDb()
    const redis = await createRedis()

    const real = [
      await insertUser('scale-first'),
      await insertUser('scale-second'),
      await insertUser('scale-third'),
    ]
    const challenge = await insertChallenge()

    const boardUsers = buildBoard(real)
    const data = buildData(boardUsers, challenge.id, [
      {
        time: T0,
        userScores: boardUsers.map(u => ({ id: u.id, score: u.score })),
      },
    ])

    await cacheLeaderboardAndGraph(db, redis, data)

    const first = (
      await db.select().from(users).where(eq(users.id, real[0]!.id))
    )[0]!
    expect(first.score).toBe(SCALE)
    expect(first.globalRank).toBe(1)
    expect(first.divisionRank).toBe(1)
    expect(new Date(first.lastSolveAt!).valueOf()).toBe(T1)

    const second = (
      await db.select().from(users).where(eq(users.id, real[1]!.id))
    )[0]!
    expect(second.score).toBe(SCALE - 1)
    expect(second.globalRank).toBe(2)
    expect(second.lastSolveAt).toBeNull()

    const challengeRow = (
      await db.select().from(challenges).where(eq(challenges.id, challenge.id))
    )[0]!
    expect(challengeRow.score).toBe(500)
    expect(challengeRow.solveCount).toBe(3)

    const packed = await redis.hmget('graph-data', [
      real[0]!.id,
      `synthetic-${SCALE - 1}`,
    ])
    expect(packed[0]).toBe(`${T0},${SCALE}`)
    expect(packed[1]).toBe(`${T0},1`)
    expect(await redis.get('graph-source')).toBe('samples')
  })

  test('clears ranks for previously ranked users that drop off the board', async () => {
    const db = getDb()
    const redis = await createRedis()

    const keeper = await insertUser('rank-keeper')
    const dropped = await insertUser('rank-dropped')
    const challenge = await insertChallenge()

    const smallBoard: LeaderboardUser[] = [keeper, dropped].map((u, i) => ({
      id: u.id,
      name: u.name,
      division: division(),
      score: 100 - i,
      hadAnySolve: true,
      lastSolve: T0,
      lastTiebreakEligibleSolve: undefined,
    }))
    await cacheLeaderboardAndGraph(
      db,
      redis,
      buildData(smallBoard, challenge.id)
    )

    const ranked = (
      await db.select().from(users).where(eq(users.id, dropped.id))
    )[0]!
    expect(ranked.globalRank).toBe(2)

    await cacheLeaderboardAndGraph(
      db,
      redis,
      buildData(buildBoard([keeper]), challenge.id)
    )

    const cleared = (
      await db.select().from(users).where(eq(users.id, dropped.id))
    )[0]!
    expect(cleared.score).toBe(0)
    expect(cleared.globalRank).toBeNull()
    expect(cleared.divisionRank).toBeNull()
    expect(cleared.lastSolveAt).toBeNull()
  })

  test('merges incremental score events while the fingerprint spans the full board', async () => {
    const db = getDb()
    const redis = await createRedis()

    const real = [
      await insertUser('events-first'),
      await insertUser('events-second'),
      await insertUser('events-third'),
    ]
    const challenge = await insertChallenge()
    const deltas = [25, 40, 55]
    for (let i = 0; i < real.length; i++) {
      await insertScoreEvent({
        challengeId: challenge.id,
        userId: real[i]!.id,
        pointsDelta: deltas[i]!,
        eventAt: isoAt(T0),
      })
    }

    const data = buildData(buildBoard(real), challenge.id)
    await cacheLeaderboardAndGraph(db, redis, data)

    expect(await redis.get('graph-source')).toBe('events')
    expect(await redis.hget('graph-data', real[0]!.id)).toBe(
      `${bucketOf(T0)},25`
    )

    await redis.hset('graph-data', 'sentinel', 'x')

    await insertScoreEvent({
      challengeId: challenge.id,
      userId: real[0]!.id,
      pointsDelta: 25,
      eventAt: isoAt(T1),
    })

    await cacheLeaderboardAndGraph(db, redis, data)

    expect(await redis.hget('graph-data', 'sentinel')).toBe('x')
    expect(await redis.hget('graph-data', real[0]!.id)).toBe(
      `${bucketOf(T0)},25,${bucketOf(T1)},50`
    )
    expect(await redis.hget('graph-data', real[1]!.id)).toBe(
      `${bucketOf(T0)},40`
    )
    expect(await redis.get('graph-source')).toBe('events')
  })
})
