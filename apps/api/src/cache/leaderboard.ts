import type { DatabaseClient } from '@rctf/db'
import { challenges, scoreEvents, users } from '@rctf/db'
import { and, asc, eq, gt, inArray, or, sql } from 'drizzle-orm'
import type { TypedRedis } from './scripts'

const keyGraphUpdate = 'graph-update'
const keyGraphData = 'graph-data'
const keyGraphCursor = 'graph-cursor'
const keyGraphFingerprint = 'graph-fingerprint'
const keyGraphSource = 'graph-source'
const graphSourceEvents = 'events'
const graphSourceSamples = 'samples'

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
          globalRank: idx + 1,
          divisionRank: divRank,
          lastSolveAt: user.lastSolve
            ? new Date(user.lastSolve).toISOString()
            : null,
          lastTiebreakSolveAt: user.lastTiebreakEligibleSolve
            ? new Date(user.lastTiebreakEligibleSolve).toISOString()
            : null,
        }
      })

      const valuesList = sql.join(
        userUpdates.map(
          u =>
            sql`(${u.id}, ${u.score}::int, ${u.globalRank}::int, ${u.divisionRank}::int, ${u.lastSolveAt}::timestamptz, ${u.lastTiebreakSolveAt}::timestamptz)`
        ),
        sql`, `
      )

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
          LEFT JOIN (VALUES ${valuesList})
            AS vals(id, score, global_rank, division_rank, last_solve_at, last_tiebreak_solve_at)
            ON u.id = vals.id::text
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
      const challValuesList = sql.join(
        Array.from(data.challengeInfos.entries()).map(
          ([id, info]) => sql`(${id}, ${info.score}::int, ${info.solves}::int)`
        ),
        sql`, `
      )

      await tx.execute(sql`
        UPDATE challenges SET
          score = v.score,
          solve_count = v.solve_count
        FROM (VALUES ${challValuesList})
          AS v(id, score, solve_count)
        WHERE challenges.id = v.id::text
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
  eventAt: string
  id: string
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

const buildGraphFromSamples = (data: CalculatedLeaderboard): GraphFold => {
  const lastSample =
    data.samples.length > 0
      ? data.samples[data.samples.length - 1]!.time
      : Date.now()
  const userPoints = new Map<string, string[]>()

  for (const sample of data.samples) {
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

const setGraphSnapshot = async (
  redis: TypedRedis,
  { lastSample, userPoints }: GraphFold
): Promise<void> => {
  const argv = [
    lastSample.toString(),
    ...Array.from(userPoints).flatMap(([id, points]) => [id, points.join(',')]),
  ]
  await redis.rctfSetGraph(keyGraphUpdate, keyGraphData, ...argv)
}

const serializeGraphCursor = (c: ScoreEventGraphCursor | null): string =>
  c ? JSON.stringify(c) : ''

const parseGraphCursor = (raw: string | null): ScoreEventGraphCursor | null => {
  try {
    const p = raw ? JSON.parse(raw) : null
    return typeof p?.eventAt === 'string' && typeof p?.id === 'string'
      ? p
      : null
  } catch {
    return null
  }
}

const commitGraphMeta = (
  redis: TypedRedis,
  fingerprint: string,
  cursor: ScoreEventGraphCursor | null,
  source: typeof graphSourceEvents | typeof graphSourceSamples
): Promise<unknown> =>
  Promise.all([
    redis.set(keyGraphFingerprint, fingerprint),
    redis.set(keyGraphCursor, serializeGraphCursor(cursor)),
    redis.set(keyGraphSource, source),
  ])

const buildGraphFingerprint = (
  userIds: string[],
  challengeIds: string[]
): string =>
  JSON.stringify({
    users: [...userIds].sort(),
    challenges: [...challengeIds].sort(),
  })

const getScoreEventGraphRows = async (
  db: DatabaseClient,
  userIds: string[],
  challengeIds: string[],
  cursor: ScoreEventGraphCursor | null
): Promise<ScoreEventGraphRow[]> => {
  const cursorClause = cursor
    ? or(
        gt(scoreEvents.eventAt, cursor.eventAt),
        and(
          eq(scoreEvents.eventAt, cursor.eventAt),
          gt(scoreEvents.id, cursor.id)
        )
      )
    : undefined

  return await db
    .select({
      id: scoreEvents.id,
      userid: scoreEvents.userid,
      pointsDelta: scoreEvents.pointsDelta,
      eventAt: scoreEvents.eventAt,
    })
    .from(scoreEvents)
    .where(
      and(
        inArray(scoreEvents.userid, userIds),
        inArray(scoreEvents.challengeid, challengeIds),
        cursorClause
      )
    )
    .orderBy(asc(scoreEvents.eventAt), asc(scoreEvents.id))
}

const hsetGraphData = async (
  redis: TypedRedis,
  userPoints: Map<string, string[]>
): Promise<void> => {
  const args = Array.from(userPoints).flatMap(([id, points]) => [
    id,
    points.join(','),
  ])
  const chunkSize = 7996
  for (let i = 0; i < args.length; i += chunkSize) {
    await redis.hset(keyGraphData, ...args.slice(i, i + chunkSize))
  }
}

const cacheGraph = async (
  db: DatabaseClient,
  redis: TypedRedis,
  data: CalculatedLeaderboard
): Promise<void> => {
  const userIds = data.users.filter(u => u.hadAnySolve).map(u => u.id)
  const challengeIds = Array.from(data.challengeInfos.keys())
  const fingerprint = buildGraphFingerprint(userIds, challengeIds)

  if (userIds.length === 0 || challengeIds.length === 0) {
    await redis.rctfSetGraph(
      keyGraphUpdate,
      keyGraphData,
      Date.now().toString()
    )
    await commitGraphMeta(redis, fingerprint, null, graphSourceEvents)
    return
  }

  const [cachedFingerprint, cachedCursorRaw, cachedSource] = await Promise.all([
    redis.get(keyGraphFingerprint),
    redis.get(keyGraphCursor),
    redis.get(keyGraphSource),
  ])

  if (cachedSource === graphSourceSamples) {
    await setGraphSnapshot(redis, buildGraphFromSamples(data))
    await commitGraphMeta(redis, fingerprint, null, graphSourceSamples)
    return
  }

  const parsedCursor = parseGraphCursor(cachedCursorRaw)
  const needsFullRebuild =
    cachedFingerprint !== fingerprint ||
    cachedSource !== graphSourceEvents ||
    cachedCursorRaw === null ||
    (cachedCursorRaw !== '' && parsedCursor === null)
  const cursor = needsFullRebuild ? null : parsedCursor
  const rows = await getScoreEventGraphRows(db, userIds, challengeIds, cursor)
  const lastRow = rows[rows.length - 1]
  const nextCursor = lastRow
    ? { eventAt: lastRow.eventAt, id: lastRow.id }
    : cursor

  if (needsFullRebuild) {
    if (rows.length === 0 && data.samples.length > 0) {
      await setGraphSnapshot(redis, buildGraphFromSamples(data))
      await commitGraphMeta(redis, fingerprint, null, graphSourceSamples)
      return
    }
    await setGraphSnapshot(redis, foldScoreEvents(rows))
    await commitGraphMeta(redis, fingerprint, nextCursor, graphSourceEvents)
    return
  }

  if (rows.length === 0) {
    await redis.set(keyGraphUpdate, Date.now().toString())
    return
  }

  const affectedUserIds = Array.from(
    new Set(rows.flatMap(row => (row.userid ? [row.userid] : [])))
  )
  const existingGraphData = await redis.hmget(keyGraphData, ...affectedUserIds)
  const seed = new Map(
    affectedUserIds.map((id, idx) => [id, existingGraphData[idx] ?? null])
  )
  const { lastSample, userPoints } = foldScoreEvents(rows, seed)

  await hsetGraphData(redis, userPoints)
  await Promise.all([
    redis.set(keyGraphUpdate, lastSample.toString()),
    redis.set(keyGraphCursor, serializeGraphCursor(nextCursor)),
  ])
}

interface GraphPoint {
  time: number
  score: number
}

interface GraphEntry {
  id: string
  name: string
  points: Array<GraphPoint>
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
  packedPoints: string | null
): GraphEntry => ({
  id: entry.id,
  name: entry.name,
  points: parseGraphPoints(lastUpdate, entry.score, packedPoints),
})

const getGraphEntries = async (
  redis: TypedRedis,
  entries: Array<GraphSourceEntry>
): Promise<Array<GraphEntry>> => {
  if (entries.length === 0) {
    return []
  }

  const [lastUpdateRaw, graphData] = await Promise.all([
    redis.get(keyGraphUpdate),
    redis.hmget(keyGraphData, ...entries.map(entry => entry.id)) as Promise<
      Array<string | null>
    >,
  ])
  const lastUpdate = Number.parseInt(lastUpdateRaw ?? '0')
  return entries.map((entry, idx) =>
    buildGraphEntry(lastUpdate, entry, graphData[idx] ?? null)
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

  return getGraphEntries(redis, topUsers)
}

export const getGraphForEntries = async (
  redis: TypedRedis,
  leaderboard: Array<GraphSourceEntry>
): Promise<Array<GraphEntry>> => getGraphEntries(redis, leaderboard)

export const cacheLeaderboardAndGraph = async (
  db: DatabaseClient,
  redis: TypedRedis,
  data: CalculatedLeaderboard
): Promise<void> => {
  await Promise.all([cacheLeaderboard(db, data), cacheGraph(db, redis, data)])
}
