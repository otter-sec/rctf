import type { DatabaseClient } from '@rctf/db'
import { challenges, users } from '@rctf/db'
import { sql } from 'drizzle-orm'
import type { TypedRedis } from './scripts'

const keyGraphUpdate = 'graph-update'
const keyGraphData = 'graph-data'

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

const cacheGraph = async (
  redis: TypedRedis,
  data: CalculatedLeaderboard
): Promise<void> => {
  if (data.samples.length === 0) {
    return
  }

  const lastSample = data.samples[data.samples.length - 1]!.time
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

  const argv: string[] = [lastSample.toString()]
  for (const [id, points] of userPoints) {
    argv.push(id, points.join(','))
  }

  await redis.rctfSetGraph(keyGraphUpdate, keyGraphData, ...argv)
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

export const userIsRankedSql = sql`${users.globalRank} IS NOT NULL`
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
        ? sql`${userIsRankedSql} AND ${users.division} = ${division}`
        : userIsRankedSql
    )
    .orderBy(leaderboardOrderSql)
    .limit(limit)
    .offset(offset)

  if (topUsers.length === 0) {
    return []
  }

  const [lastUpdateRaw, graphData] = await Promise.all([
    redis.get(keyGraphUpdate),
    redis.hmget(keyGraphData, ...topUsers.map(u => u.id)) as Promise<
      Array<string | null>
    >,
  ])

  const lastUpdate = Number.parseInt(lastUpdateRaw ?? '0')
  return topUsers.map((entry, idx) =>
    buildGraphEntry(lastUpdate, entry, graphData[idx] ?? null)
  )
}

export const getGraphForEntries = async (
  redis: TypedRedis,
  leaderboard: Array<GraphSourceEntry>
): Promise<Array<GraphEntry>> => {
  if (leaderboard.length === 0) {
    return []
  }

  const [lastUpdateRaw, graphData] = await Promise.all([
    redis.get(keyGraphUpdate),
    redis.hmget(keyGraphData, ...leaderboard.map(entry => entry.id)) as Promise<
      Array<string | null>
    >,
  ])

  const lastUpdate = Number.parseInt(lastUpdateRaw ?? '0')
  return leaderboard.map((entry, idx) =>
    buildGraphEntry(lastUpdate, entry, graphData[idx] ?? null)
  )
}

export const cacheLeaderboardAndGraph = async (
  db: DatabaseClient,
  redis: TypedRedis,
  data: CalculatedLeaderboard
): Promise<void> => {
  await Promise.all([cacheLeaderboard(db, data), cacheGraph(redis, data)])
}
