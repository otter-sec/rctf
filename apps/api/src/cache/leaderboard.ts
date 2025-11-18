import { config } from '@rctf/config'
import type { TypedRedis } from './scripts'

const keyGraphUpdate = 'graph-update'
const keyGraphUser = (userId: string) => `graph:${userId}`

const keyScorePositions = 'score-positions'
const keyChallengeInfo = 'challenge-info'

const keysPerUser = 3
const keyLeaderboardUpdate = 'leaderboard-update'
const keyLeaderboard = (division?: string) =>
  division ? `division-leaderboard:${division}` : 'global-leaderboard'

export type InternalChallengeInfo = {
  id: string
  tiebreakEligible: boolean
  solves: number
  score: number
  minPoints: number
  maxPoints: number
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

export type CalculatedLeaderboard = {
  leaderboardUpdate: number
  users: Array<
    Pick<InternalUserInfo, 'id' | 'name' | 'division' | 'score'> & {
      hadAnySolve: boolean
    }
  >
  challengeInfos: Map<string, Pick<InternalChallengeInfo, 'score' | 'solves'>>
  samples: Array<{
    time: number
    userScores: Array<{ id: string; score: number }>
  }>
}

export type LeaderboardResult = {
  total: number
  leaderboard: Array<{ id: string; name: string; score: number }>
}

const cacheLeaderboard = async (
  redis: TypedRedis,
  data: CalculatedLeaderboard
): Promise<void> => {
  const divisions = Object.keys(config.divisions)
  const keys = [
    keyScorePositions,
    keyChallengeInfo,
    keyLeaderboard(),
    keyLeaderboardUpdate,
    ...divisions.map(d => keyLeaderboard(d)),
  ]

  const wireChallengeInfos: string[] = Array.from(data.challengeInfos.entries())
    .map(([id, challengeInfo]) => [
      id,
      `${challengeInfo.score},${challengeInfo.solves}`,
    ])
    .flat()
  const wireLeaderboard: string[] = data.users
    .map(userInfo => [
      userInfo.id,
      userInfo.name,
      userInfo.division ?? '',
      userInfo.score.toString(),
    ])
    .flat()

  await redis.rctfSetLeaderboard(
    keys.length,
    ...keys,
    JSON.stringify(wireLeaderboard),
    JSON.stringify(divisions),
    JSON.stringify(wireChallengeInfos),
    data.leaderboardUpdate.toString()
  )
}

const cacheGraph = async (
  redis: TypedRedis,
  data: CalculatedLeaderboard
): Promise<void> => {
  const latest = data.samples[data.samples.length - 1]!
  const lastSample = latest.time
  const userPoints = new Map<string, string[]>()

  for (const { id, score } of latest.userScores) {
    let arr = userPoints.get(id)
    if (!arr) {
      arr = []
      userPoints.set(id, arr)
    }

    arr.push(lastSample.toString(), score.toString())
  }

  const ids = Array.from(userPoints.keys())
  const keys = [keyGraphUpdate, ...ids.map(id => keyGraphUser(id))]
  const values = ids.map(id => userPoints.get(id) ?? [])
  await redis.rctfSetGraph(
    keys.length,
    ...keys,
    lastSample.toString(),
    JSON.stringify(values)
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
}

export const getGraph = async (
  redis: TypedRedis,
  limit: number,
  division?: string
): Promise<Array<GraphEntry>> => {
  const json = await redis.rctfGetGraph(
    keyLeaderboard(division),
    keyLeaderboardUpdate,
    limit.toString()
  )

  const parsed = JSON.parse(json) as [string, string[], string[][]]

  const lastUpdate = Number.parseInt(parsed[0] ?? '0')
  const latest = parsed[1] ?? []
  const graphData = parsed[2] ?? []

  const result: Array<GraphEntry> = []
  for (let i = 0; i < latest.length; i += 3) {
    const id = latest[i] ?? ''
    const name = latest[i + 1] ?? ''
    const curScore = Number.parseInt(latest[i + 2] ?? '0')

    const userIdx = Math.floor(i / 3)
    const fields = graphData[userIdx] ?? []

    const points: Array<GraphPoint> = []
    if (lastUpdate > 0) {
      points.push({ time: lastUpdate, score: curScore })
    }

    for (let j = 0; j < fields.length; j += 2) {
      points.push({
        time: Number.parseInt(fields[j] ?? '0'),
        score: Number.parseInt(fields[j + 1] ?? '0'),
      })
    }

    points.sort((a, b) => b.time - a.time)
    result.push({ id, name, points })
  }

  return result
}

const getLeaderboardInternal = async (
  redis: TypedRedis,
  key: string,
  start: number,
  end: number
): Promise<LeaderboardResult> => {
  const result = await redis.rctfGetRange(key, start.toString(), end.toString())

  const leaderboard: Array<{ id: string; name: string; score: number }> = []
  for (let i = 0; i < result.length - 1; i += keysPerUser) {
    leaderboard.push({
      id: result[i] ?? '',
      name: result[i + 1] ?? '',
      score: Number.parseInt(result[i + 2] ?? '0'),
    })
  }

  return {
    total: Number.parseInt(result[result.length - 1] ?? '0') / keysPerUser,
    leaderboard,
  }
}

export const getLeaderboard = async (
  redis: TypedRedis,
  limit: number,
  offset: number,
  division?: string
): Promise<LeaderboardResult> => {
  const key = keyLeaderboard(division)
  if (limit === 0) {
    return {
      total: Math.floor((await redis.llen(key)) / keysPerUser),
      leaderboard: [],
    }
  }

  const start = offset * keysPerUser
  const end = start + limit * keysPerUser - 1
  return await getLeaderboardInternal(redis, key, start, end)
}

export const getFullLeaderboard = async (
  redis: TypedRedis,
  division?: string
): Promise<LeaderboardResult> => {
  const key = keyLeaderboard(division)
  return await getLeaderboardInternal(redis, key, 0, -1)
}

export const getChallengeDynamicPointsValue = async (
  redis: TypedRedis,
  challengeIds: string[]
): Promise<Array<{ score: number | null; solves: number | null }>> => {
  if (challengeIds.length === 0) {
    return []
  }

  const redisResult = await redis.hmget(keyChallengeInfo, ...challengeIds)
  return redisResult.map(info => {
    if (info === null) {
      return {
        score: null,
        solves: null,
      }
    }

    const [score, solves] = info.split(',')
    return {
      score: parseInt(score ?? '0'),
      solves: parseInt(solves ?? '0'),
    }
  })
}

export const getUserScore = async (
  redis: TypedRedis,
  userId: string
): Promise<{
  score: number | null
  place: number | null
  divisionPlace: number | null
}> => {
  const redisResult = await redis.hget(keyScorePositions, userId)
  if (!redisResult) {
    return {
      score: null,
      place: null,
      divisionPlace: null,
    }
  }

  const [score, place, divisionPlace] = redisResult.split(',')
  return {
    score: Number.parseInt(score ?? '0'),
    place: Number.parseInt(place ?? '0'),
    divisionPlace: Number.parseInt(divisionPlace ?? '0'),
  }
}

export const cacheLeaderboardAndGraph = async (
  redis: TypedRedis,
  data: CalculatedLeaderboard
): Promise<void> => {
  await cacheLeaderboard(redis, data)
  await cacheGraph(redis, data)
}
