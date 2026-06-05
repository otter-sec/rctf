import type { DatabaseClient } from '@rctf/db'
import { challenges, scoreEvents, users } from '@rctf/db'
import { and, asc, eq, gte, inArray, sql } from 'drizzle-orm'
import { inJsonbArray } from '../lib/db-bulk'
import { challengeIsPublicSql } from '../services/challenges'
import type { TypedRedis } from './scripts'

const keyGraphUpdate = 'graph-update'
const keyGraphData = 'graph-data'
const keyGraphCursor = 'graph-cursor'
const keyGraphFingerprint = 'graph-fingerprint'
const keyGraphSource = 'graph-source'
const graphSourceEvents = 'events'
const graphSourceSamples = 'samples'
const keyDynamicGraph = 'dynamic-graph'
const dynamicGraphCacheTtlSeconds = 60

export type InternalChallengeInfo = {
  id: string
  tiebreakEligible: boolean
  name: string
  category: string
  solves: number
  score: number
  minPoints: number
  maxPoints: number
  sortWeight: number | null
  firstSolveTime: number | null
}

export type InternalUserInfo = {
  id: string
  name: string
  division: string | null
  banned: boolean
  score: number
  lastSolve: number | undefined
  lastTiebreakEligibleSolve: number | undefined
  solvedChallengeIds: string[]
}

export type Sample = {
  time: number
  userScores: Array<{ id: string; score: number }>
}

export type CalculatedLeaderboard = {
  users: Array<
    Pick<InternalUserInfo, 'id' | 'name' | 'division' | 'score'> & {
      hadAnySolve: boolean
      lastSolve: number | undefined
      lastTiebreakEligibleSolve: number | undefined
    }
  >
  challengeInfos: Map<
    string,
    Pick<
      InternalChallengeInfo,
      'score' | 'solves' | 'name' | 'category' | 'sortWeight'
    >
  >
  samples: Array<Sample>
}

const cacheLeaderboard = async (
  db: DatabaseClient,
  data: CalculatedLeaderboard
): Promise<void> => {
  const scoredUsers = data.users.filter(u => u.hadAnySolve)
  await db.transaction(async tx => {
    if (scoredUsers.length > 0) {
      const divisionCounters = new Map<string, number>()
      const userUpdates = scoredUsers.map((user, idx) => {
        const division = user.division ?? ''
        const divRank = (divisionCounters.get(division) ?? 0) + 1
        divisionCounters.set(division, divRank)
        return {
          id: user.id,
          score: user.score,
          global_rank: idx + 1,
          division_rank: divRank,
          last_solve_at: user.lastSolve
            ? new Date(user.lastSolve).toISOString()
            : null,
          last_tiebreak_solve_at: user.lastTiebreakEligibleSolve
            ? new Date(user.lastTiebreakEligibleSolve).toISOString()
            : null,
        }
      })

      // a single jsonb parameter: a per-row VALUES list binds 6 parameters
      // per user and overflows the postgres protocol limit of 65534
      await tx.execute(sql`
        UPDATE users SET
          score = COALESCE(resolved.score, 0),
          global_rank = resolved.global_rank,
          division_rank = resolved.division_rank,
          last_solve_at = resolved.last_solve_at,
          last_tiebreak_solve_at = resolved.last_tiebreak_solve_at
        FROM (
          SELECT
            u.id,
            vals.score,
            vals.global_rank,
            vals.division_rank,
            vals.last_solve_at,
            vals.last_tiebreak_solve_at
          FROM users u
          LEFT JOIN jsonb_to_recordset(${JSON.stringify(userUpdates)}::jsonb)
            AS vals(id text, score int, global_rank int, division_rank int, last_solve_at timestamptz, last_tiebreak_solve_at timestamptz)
            ON u.id = vals.id
          WHERE u.global_rank IS NOT NULL OR vals.id IS NOT NULL
        ) resolved
        WHERE users.id = resolved.id
      `)
    } else {
      await tx
        .update(users)
        .set({
          score: 0,
          globalRank: null,
          divisionRank: null,
          lastSolveAt: null,
          lastTiebreakSolveAt: null,
        })
        .where(userIsRankedSql)
    }

    await tx
      .update(challenges)
      .set({ score: 0, solveCount: 0 })
      .where(sql`${challenges.score} != 0 OR ${challenges.solveCount} != 0`)

    if (data.challengeInfos.size > 0) {
      const challengeUpdates = Array.from(
        data.challengeInfos.entries(),
        ([id, info]) => ({ id, score: info.score, solve_count: info.solves })
      )

      await tx.execute(sql`
        UPDATE challenges SET
          score = v.score,
          solve_count = v.solve_count
        FROM jsonb_to_recordset(${JSON.stringify(challengeUpdates)}::jsonb)
          AS v(id text, score int, solve_count int)
        WHERE challenges.id = v.id
      `)
    }
  })
}

type ScoreEventGraphRow = {
  id: string
  userid: string | null
  pointsDelta: number
  eventAt: string
}

type ScoreEventGraphCursor = {
  time: string
  ids: string[]
}

type GraphFold = { lastSample: number; userPoints: Map<string, string[]> }

const lastPackedScore = (packed: string | null): number =>
  Number.parseInt(packed?.split(',').pop() ?? '0') || 0

const foldScoreEvents = (
  rows: ScoreEventGraphRow[],
  seed?: Map<string, string | null>
): GraphFold => {
  const scores = new Map<string, number>()
  const userPoints = new Map<string, string[]>()
  let lastSample = Date.now()

  const ensureUser = (id: string): { score: number; points: string[] } => {
    let points = userPoints.get(id)
    if (!points) {
      const packed = seed?.get(id) ?? null
      points = packed ? packed.split(',') : []
      userPoints.set(id, points)
      scores.set(id, lastPackedScore(packed))
    }
    return { score: scores.get(id) ?? 0, points }
  }

  for (const row of rows) {
    if (!row.userid) {
      continue
    }
    const eventAt = new Date(row.eventAt).valueOf()
    if (!Number.isFinite(eventAt)) {
      continue
    }

    lastSample = Math.max(lastSample, eventAt)
    const { score, points } = ensureUser(row.userid)
    const nextScore = score + row.pointsDelta
    scores.set(row.userid, nextScore)

    const lastPointTime = points.length >= 2 ? points[points.length - 2] : null
    if (lastPointTime === eventAt.toString()) {
      points[points.length - 1] = nextScore.toString()
    } else {
      points.push(eventAt.toString(), nextScore.toString())
    }
  }

  return { lastSample, userPoints }
}

const buildGraphFromSamples = (
  data: CalculatedLeaderboard,
  beforeTime?: number
): GraphFold => {
  const samples =
    beforeTime === undefined
      ? data.samples
      : data.samples.filter(sample => sample.time < beforeTime)
  const lastSample =
    samples.length > 0
      ? samples[samples.length - 1]!.time
      : beforeTime === undefined
        ? Date.now()
        : 0
  const userPoints = new Map<string, string[]>()

  for (const sample of samples) {
    for (const { id, score } of sample.userScores) {
      let arr = userPoints.get(id)
      if (!arr) {
        arr = []
        userPoints.set(id, arr)
      }
      arr.push(sample.time.toString(), score.toString())
    }
  }

  return { lastSample, userPoints }
}

const buildGraphFromEventsWithSampleBaseline = (
  data: CalculatedLeaderboard,
  rows: ScoreEventGraphRow[]
): GraphFold => {
  let firstEventTime = Number.POSITIVE_INFINITY
  for (const row of rows) {
    const time = new Date(row.eventAt).valueOf()
    if (Number.isFinite(time) && time < firstEventTime) {
      firstEventTime = time
    }
  }
  const baseline = buildGraphFromSamples(data, firstEventTime)
  const seed = new Map(
    Array.from(baseline.userPoints, ([id, points]) => [id, points.join(',')])
  )
  const folded = foldScoreEvents(rows, seed)
  const userPoints = new Map(baseline.userPoints)

  for (const [id, points] of folded.userPoints) {
    userPoints.set(id, points)
  }

  return {
    lastSample: Math.max(baseline.lastSample, folded.lastSample),
    userPoints,
  }
}

const replaceGraphAtomic = (
  redis: TypedRedis,
  fold: GraphFold,
  fingerprint: string,
  cursor: ScoreEventGraphCursor | null,
  source: typeof graphSourceEvents | typeof graphSourceSamples
): Promise<void> =>
  redis.rctfReplaceGraph(
    keyGraphUpdate,
    keyGraphData,
    keyGraphFingerprint,
    keyGraphCursor,
    keyGraphSource,
    fold.lastSample.toString(),
    fingerprint,
    cursor ? JSON.stringify(cursor) : '',
    source,
    packGraphUpdates(fold.userPoints)
  )

const buildGraphFingerprint = (
  userIds: string[],
  challengeIds: string[]
): string =>
  JSON.stringify({
    users: [...userIds].sort(),
    challenges: [...challengeIds].sort(),
  })

const buildGraphCursor = (
  rows: ScoreEventGraphRow[],
  previous?: ScoreEventGraphCursor
): ScoreEventGraphCursor | null => {
  const lastRow = rows[rows.length - 1]
  if (!lastRow) {
    return previous ?? null
  }

  const ids = new Set<string>()
  if (previous?.time === lastRow.eventAt) {
    for (const id of previous.ids) {
      ids.add(id)
    }
  }
  for (const row of rows) {
    if (row.eventAt === lastRow.eventAt) {
      ids.add(row.id)
    }
  }

  return { time: lastRow.eventAt, ids: [...ids].sort() }
}

const getScoreEventGraphRows = async (
  db: DatabaseClient,
  userIds: string[],
  challengeIds: string[],
  cursor: ScoreEventGraphCursor | null = null
): Promise<ScoreEventGraphRow[]> => {
  const rows = await db
    .select({
      id: scoreEvents.id,
      userid: scoreEvents.userid,
      pointsDelta: scoreEvents.pointsDelta,
      eventAt: scoreEvents.eventAt,
    })
    .from(scoreEvents)
    .where(
      and(
        inJsonbArray(scoreEvents.userid, userIds),
        inArray(scoreEvents.challengeid, challengeIds),
        cursor ? gte(scoreEvents.eventAt, cursor.time) : undefined
      )
    )
    .orderBy(asc(scoreEvents.eventAt), asc(scoreEvents.id))

  if (!cursor) {
    return rows
  }

  const processedAtCursor = new Set(cursor.ids)
  return rows.filter(
    row => row.eventAt !== cursor.time || !processedAtCursor.has(row.id)
  )
}

const loadGraphSeed = async (
  redis: TypedRedis,
  rows: ScoreEventGraphRow[]
): Promise<Map<string, string | null>> => {
  const userIds = Array.from(
    new Set(rows.flatMap(row => (row.userid ? [row.userid] : [])))
  )
  if (userIds.length === 0) {
    return new Map()
  }
  const packed = await redis.hmget(keyGraphData, userIds)
  return new Map(userIds.map((id, idx) => [id, packed[idx] ?? null]))
}

const packGraphUpdates = (
  userPoints: ReadonlyMap<string, string[]>
): string[] =>
  Array.from(userPoints).flatMap(([id, points]) => [id, points.join(',')])

const cacheGraphIncremental = async (
  db: DatabaseClient,
  redis: TypedRedis,
  userIds: string[],
  challengeIds: string[],
  fingerprint: string,
  cursor: ScoreEventGraphCursor
): Promise<void> => {
  const rows = await getScoreEventGraphRows(db, userIds, challengeIds, cursor)
  if (rows.length === 0) {
    // no new events since the cursor: bump freshness only, cursor/fingerprint/source stay valid
    await redis.set(keyGraphUpdate, Date.now().toString())
    return
  }

  const seed = await loadGraphSeed(redis, rows)
  const fold = foldScoreEvents(rows, seed)
  const nextCursor = buildGraphCursor(rows, cursor)!

  await redis.rctfMergeGraph(
    keyGraphUpdate,
    keyGraphData,
    keyGraphFingerprint,
    keyGraphCursor,
    keyGraphSource,
    fold.lastSample.toString(),
    fingerprint,
    JSON.stringify(nextCursor),
    graphSourceEvents,
    packGraphUpdates(fold.userPoints)
  )
}

const emptyFold = (): GraphFold => ({
  lastSample: Date.now(),
  userPoints: new Map(),
})

const cacheGraph = async (
  db: DatabaseClient,
  redis: TypedRedis,
  data: CalculatedLeaderboard
): Promise<void> => {
  const userIds = data.users.filter(u => u.hadAnySolve).map(u => u.id)
  const challengeIds = Array.from(data.challengeInfos.keys())
  const fingerprint = buildGraphFingerprint(userIds, challengeIds)

  if (userIds.length === 0 || challengeIds.length === 0) {
    await replaceGraphAtomic(
      redis,
      emptyFold(),
      fingerprint,
      null,
      graphSourceEvents
    )
    return
  }

  const [cachedFingerprint, cachedSource, cachedCursorRaw] = await Promise.all([
    redis.get(keyGraphFingerprint),
    redis.get(keyGraphSource),
    redis.get(keyGraphCursor),
  ])
  if (
    cachedFingerprint === fingerprint &&
    cachedSource === graphSourceEvents &&
    cachedCursorRaw
  ) {
    await cacheGraphIncremental(
      db,
      redis,
      userIds,
      challengeIds,
      fingerprint,
      JSON.parse(cachedCursorRaw) as ScoreEventGraphCursor
    )
    return
  }

  const rows = await getScoreEventGraphRows(db, userIds, challengeIds)
  if (rows.length > 0) {
    await replaceGraphAtomic(
      redis,
      buildGraphFromEventsWithSampleBaseline(data, rows),
      fingerprint,
      buildGraphCursor(rows),
      graphSourceEvents
    )
    return
  }

  if (data.samples.length > 0) {
    await replaceGraphAtomic(
      redis,
      buildGraphFromSamples(data),
      fingerprint,
      null,
      graphSourceSamples
    )
    return
  }

  await replaceGraphAtomic(
    redis,
    emptyFold(),
    fingerprint,
    null,
    graphSourceEvents
  )
}

interface GraphPoint {
  time: number
  score: number
}

interface GraphEntry {
  id: string
  name: string
  points: Array<GraphPoint>
  dynamicPoints: Array<GraphPoint>
}

type GraphSourceEntry = {
  id: string
  name: string
  score: number
}

const parseGraphPoints = (
  lastUpdate: number,
  curScore: number,
  packedPoints: string | null
): Array<GraphPoint> => {
  const points: Array<GraphPoint> = []
  if (lastUpdate > 0) {
    points.push({ time: lastUpdate, score: curScore })
  }

  if (packedPoints) {
    const parts = packedPoints.split(',')
    for (let i = 0; i < parts.length; i += 2) {
      points.push({
        time: Number.parseInt(parts[i] ?? '0'),
        score: Number.parseInt(parts[i + 1] ?? '0'),
      })
    }
  }

  points.sort((a, b) => b.time - a.time)
  return points
}

const buildGraphEntry = (
  lastUpdate: number,
  entry: GraphSourceEntry,
  packedPoints: string | null,
  dynamicPoints: Array<GraphPoint> = []
): GraphEntry => ({
  id: entry.id,
  name: entry.name,
  points: parseGraphPoints(lastUpdate, entry.score, packedPoints),
  dynamicPoints,
})

const dynamicGraphCacheKey = (
  lastUpdate: number,
  userIds: string[]
): string => {
  const digest = Bun.hash([...userIds].sort().join(',')).toString(36)
  return `${keyDynamicGraph}:${lastUpdate}:${digest}`
}

const deserializeDynamicPoints = (
  raw: string
): Map<string, Array<GraphPoint>> | null => {
  try {
    return new Map(JSON.parse(raw) as Array<[string, Array<GraphPoint>]>)
  } catch {
    return null
  }
}

const getDynamicGraphPoints = async (
  db: DatabaseClient,
  redis: TypedRedis,
  lastUpdate: number,
  entries: Array<GraphSourceEntry>
): Promise<Map<string, Array<GraphPoint>>> => {
  const userIds = entries.map(entry => entry.id)
  if (userIds.length === 0) {
    return new Map()
  }

  const cacheKey = dynamicGraphCacheKey(lastUpdate, userIds)
  const cached = await redis.get(cacheKey)
  if (cached !== null) {
    const parsed = deserializeDynamicPoints(cached)
    if (parsed) {
      return parsed
    }
  }

  const rows = await db
    .select({
      id: scoreEvents.id,
      userid: scoreEvents.userid,
      pointsDelta: scoreEvents.pointsDelta,
      eventAt: scoreEvents.eventAt,
    })
    .from(scoreEvents)
    .innerJoin(
      challenges,
      and(eq(challenges.id, scoreEvents.challengeid), challengeIsPublicSql)
    )
    .where(
      and(
        inJsonbArray(scoreEvents.userid, userIds),
        eq(scoreEvents.source, 'feed')
      )
    )
    .orderBy(asc(scoreEvents.eventAt), asc(scoreEvents.id))

  const fold = foldScoreEvents(rows)
  const sampleTime = Math.max(lastUpdate, fold.lastSample)
  const result = new Map<string, Array<GraphPoint>>()
  for (const entry of entries) {
    const packed = fold.userPoints.get(entry.id)?.join(',') ?? null
    if (!packed) {
      continue
    }

    result.set(
      entry.id,
      parseGraphPoints(sampleTime, lastPackedScore(packed), packed)
    )
  }

  await redis.set(
    cacheKey,
    JSON.stringify(Array.from(result.entries())),
    'EX',
    dynamicGraphCacheTtlSeconds
  )
  return result
}

const getGraphEntries = async (
  db: DatabaseClient,
  redis: TypedRedis,
  entries: Array<GraphSourceEntry>
): Promise<Array<GraphEntry>> => {
  if (entries.length === 0) {
    return []
  }

  const [lastUpdateRaw, graphData] = await Promise.all([
    redis.get(keyGraphUpdate),
    redis.hmget(
      keyGraphData,
      entries.map(entry => entry.id)
    ),
  ])
  const lastUpdate = Number.parseInt(lastUpdateRaw ?? '0')
  const dynamicPointsByUser = await getDynamicGraphPoints(
    db,
    redis,
    lastUpdate,
    entries
  )

  return entries.map((entry, idx) =>
    buildGraphEntry(
      lastUpdate,
      entry,
      graphData[idx] ?? null,
      dynamicPointsByUser.get(entry.id) ?? []
    )
  )
}

export const userIsRankedSql = sql`${users.globalRank} IS NOT NULL`
export const userIsPublicRankedSql = sql`${userIsRankedSql} AND ${users.banned} = false`
export const leaderboardOrderSql = sql`${users.globalRank} ASC`
export const getGraph = async (
  db: DatabaseClient,
  redis: TypedRedis,
  limit: number,
  offset: number,
  division?: string
): Promise<Array<GraphEntry>> => {
  const topUsers = await db
    .select({
      id: users.id,
      name: users.name,
      score: users.score,
    })
    .from(users)
    .where(
      division
        ? sql`${userIsPublicRankedSql} AND ${users.division} = ${division}`
        : userIsPublicRankedSql
    )
    .orderBy(leaderboardOrderSql)
    .limit(limit)
    .offset(offset)

  return getGraphEntries(db, redis, topUsers)
}

export const getGraphForEntries = async (
  db: DatabaseClient,
  redis: TypedRedis,
  leaderboard: Array<GraphSourceEntry>
): Promise<Array<GraphEntry>> => getGraphEntries(db, redis, leaderboard)

export const cacheLeaderboardAndGraph = async (
  db: DatabaseClient,
  redis: TypedRedis,
  data: CalculatedLeaderboard
): Promise<void> => {
  await Promise.all([cacheLeaderboard(db, data), cacheGraph(db, redis, data)])
}
