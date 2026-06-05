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

type GraphSource = typeof graphSourceEvents | typeof graphSourceSamples

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
  const divisionCounters = new Map<string, number>()
  const userUpdates = data.users
    .filter(u => u.hadAnySolve)
    .map((user, idx) => {
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
  const challengeUpdates = Array.from(
    data.challengeInfos.entries(),
    ([id, info]) => ({ id, score: info.score, solve_count: info.solves })
  )

  await db.transaction(async tx => {
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

    await tx.execute(sql`
      UPDATE challenges SET
        score = COALESCE(resolved.score, 0),
        solve_count = COALESCE(resolved.solve_count, 0)
      FROM (
        SELECT c.id, vals.score, vals.solve_count
        FROM challenges c
        LEFT JOIN jsonb_to_recordset(${JSON.stringify(challengeUpdates)}::jsonb)
          AS vals(id text, score int, solve_count int)
          ON c.id = vals.id
        WHERE c.score != 0 OR c.solve_count != 0 OR vals.id IS NOT NULL
      ) resolved
      WHERE challenges.id = resolved.id
    `)
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

const lastPointScore = (points: readonly string[]): number =>
  Number.parseInt(points[points.length - 1] ?? '0') || 0

const emptyFold = (): GraphFold => ({
  lastSample: Date.now(),
  userPoints: new Map(),
})

const foldScoreEvents = (
  rows: ScoreEventGraphRow[],
  seed?: ReadonlyMap<string, string[]>
): GraphFold => {
  const userPoints = new Map<string, string[]>(seed)
  let lastSample = Date.now()

  for (const row of rows) {
    const eventAt = new Date(row.eventAt).valueOf()
    if (!row.userid || !Number.isFinite(eventAt)) {
      continue
    }
    lastSample = Math.max(lastSample, eventAt)

    let points = userPoints.get(row.userid)
    if (!points) {
      points = []
      userPoints.set(row.userid, points)
    }

    const score = lastPointScore(points) + row.pointsDelta
    if (points[points.length - 2] === eventAt.toString()) {
      points[points.length - 1] = score.toString()
    } else {
      points.push(eventAt.toString(), score.toString())
    }
  }

  return { lastSample, userPoints }
}

const buildGraphFromSamples = (data: CalculatedLeaderboard): GraphFold => {
  const userPoints = new Map<string, string[]>()

  for (const sample of data.samples) {
    for (const { id, score } of sample.userScores) {
      let points = userPoints.get(id)
      if (!points) {
        points = []
        userPoints.set(id, points)
      }
      points.push(sample.time.toString(), score.toString())
    }
  }

  return {
    lastSample: data.samples.at(-1)?.time ?? Date.now(),
    userPoints,
  }
}

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

  const ids = rows
    .filter(row => row.eventAt === lastRow.eventAt)
    .map(row => row.id)
  if (previous?.time === lastRow.eventAt) {
    ids.push(...previous.ids)
  }
  return { time: lastRow.eventAt, ids: [...new Set(ids)].sort() }
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
): Promise<Map<string, string[]>> => {
  const userIds = Array.from(
    new Set(rows.map(row => row.userid).filter((id): id is string => !!id))
  )
  if (userIds.length === 0) {
    return new Map()
  }

  const packed = await redis.hmget(keyGraphData, userIds)
  const seed = new Map<string, string[]>()
  userIds.forEach((id, idx) => {
    const points = packed[idx]
    if (points) {
      seed.set(id, points.split(','))
    }
  })
  return seed
}

const packGraphUpdates = (
  userPoints: ReadonlyMap<string, string[]>
): string[] =>
  Array.from(userPoints).flatMap(([id, points]) => [id, points.join(',')])

const writeGraph = (
  redis: TypedRedis,
  command: 'rctfReplaceGraph' | 'rctfMergeGraph',
  fold: GraphFold,
  fingerprint: string,
  cursor: ScoreEventGraphCursor | null,
  source: GraphSource
): Promise<void> =>
  redis[command](
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

const loadIncrementalCursor = async (
  redis: TypedRedis,
  fingerprint: string
): Promise<ScoreEventGraphCursor | null> => {
  const [cachedFingerprint, cachedSource, cachedCursor] = await Promise.all([
    redis.get(keyGraphFingerprint),
    redis.get(keyGraphSource),
    redis.get(keyGraphCursor),
  ])
  if (
    cachedFingerprint !== fingerprint ||
    cachedSource !== graphSourceEvents ||
    !cachedCursor
  ) {
    return null
  }
  try {
    return JSON.parse(cachedCursor) as ScoreEventGraphCursor
  } catch {
    return null
  }
}

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
  await writeGraph(
    redis,
    'rctfMergeGraph',
    foldScoreEvents(rows, seed),
    fingerprint,
    buildGraphCursor(rows, cursor),
    graphSourceEvents
  )
}

const cacheGraph = async (
  db: DatabaseClient,
  redis: TypedRedis,
  data: CalculatedLeaderboard
): Promise<void> => {
  const userIds = data.users.filter(u => u.hadAnySolve).map(u => u.id)
  const challengeIds = Array.from(data.challengeInfos.keys())
  const fingerprint = buildGraphFingerprint(userIds, challengeIds)
  const replaceGraph = (
    fold: GraphFold,
    cursor: ScoreEventGraphCursor | null,
    source: GraphSource
  ): Promise<void> =>
    writeGraph(redis, 'rctfReplaceGraph', fold, fingerprint, cursor, source)

  if (userIds.length === 0 || challengeIds.length === 0) {
    return replaceGraph(emptyFold(), null, graphSourceEvents)
  }

  const cursor = await loadIncrementalCursor(redis, fingerprint)
  if (cursor) {
    return cacheGraphIncremental(
      db,
      redis,
      userIds,
      challengeIds,
      fingerprint,
      cursor
    )
  }

  const rows = await getScoreEventGraphRows(db, userIds, challengeIds)
  if (rows.length > 0) {
    return replaceGraph(
      foldScoreEvents(rows),
      buildGraphCursor(rows),
      graphSourceEvents
    )
  }
  if (data.samples.length > 0) {
    return replaceGraph(buildGraphFromSamples(data), null, graphSourceSamples)
  }
  return replaceGraph(emptyFold(), null, graphSourceEvents)
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

// newest-first points: the current score at lastUpdate, then the packed history
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

const dynamicGraphCacheKey = (
  lastUpdate: number,
  userIds: string[]
): string => {
  const digest = Bun.hash([...userIds].sort().join(',')).toString(36)
  return `${keyDynamicGraph}:${lastUpdate}:${digest}`
}

const deserializeDynamicPoints = (
  raw: string | null
): Map<string, Array<GraphPoint>> | null => {
  if (raw === null) {
    return null
  }
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
  const cached = deserializeDynamicPoints(await redis.get(cacheKey))
  if (cached) {
    return cached
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
    const points = fold.userPoints.get(entry.id)
    if (points?.length) {
      result.set(
        entry.id,
        parseGraphPoints(sampleTime, lastPointScore(points), points.join(','))
      )
    }
  }

  await redis.set(
    cacheKey,
    JSON.stringify([...result]),
    'EX',
    dynamicGraphCacheTtlSeconds
  )
  return result
}

export const getGraphForEntries = async (
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

  return entries.map((entry, idx) => ({
    id: entry.id,
    name: entry.name,
    points: parseGraphPoints(lastUpdate, entry.score, graphData[idx] ?? null),
    dynamicPoints: dynamicPointsByUser.get(entry.id) ?? [],
  }))
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

  return getGraphForEntries(db, redis, topUsers)
}

export const cacheLeaderboardAndGraph = async (
  db: DatabaseClient,
  redis: TypedRedis,
  data: CalculatedLeaderboard
): Promise<void> => {
  await Promise.all([cacheLeaderboard(db, data), cacheGraph(db, redis, data)])
}
