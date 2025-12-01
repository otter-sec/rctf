import { config } from '@rctf/config'
import type { TypedRedis } from './scripts'

const keyGraphUpdate = 'graph-update'
const keyGraphData = 'graph-data'

const keyScorePositions = 'score-positions'
const keyChallengeInfo = 'challenge-info'

const keysPerUser = 3
const keyLeaderboardUpdate = 'leaderboard-update'
const keyLeaderboard = (division?: string) =>
  division ? `division-leaderboard:${division}` : 'global-leaderboard'

export type InternalChallengeInfo = {
  id: string
  tiebreakEligible: boolean
  name: string
  category: string
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
  challengeInfos: Map<
    string,
    Pick<InternalChallengeInfo, 'score' | 'solves' | 'name' | 'category'>
  >
  samples: Array<{
    time: number
    userScores: Array<{ id: string; score: number }>
  }>
}

export type LeaderboardResult = {
  total: number
  leaderboard: Array<{ id: string; name: string; score: number }>
}

export type CachedChallengeInfo = {
  score: number | null
  solves: number | null
  name: string | null
  category: string | null
}

const parseCachedChallengeInfo = (
  value: string | null
): CachedChallengeInfo => {
  if (!value) {
    return { score: null, solves: null, name: null, category: null }
  }

  try {
    const parsed = JSON.parse(value) as Partial<{
      score: number
      solves: number
      name: string
      category: string
    }>
    return {
      score: parsed.score ?? null,
      solves: parsed.solves ?? null,
      name: parsed.name ?? null,
      category: parsed.category ?? null,
    }
  } catch {
    const [score, solves] = value.split(',')
    return {
      score: Number.parseInt(score ?? '0'),
      solves: Number.parseInt(solves ?? '0'),
      name: null,
      category: null,
    }
  }
}

const parseChallengeInfoEntries = (
  entries: string[]
): Record<string, CachedChallengeInfo> => {
  const result: Record<string, CachedChallengeInfo> = {}
  for (let i = 0; i < entries.length; i += 2) {
    const id = entries[i]
    const value = entries[i + 1] ?? null
    if (!id) {
      continue
    }
    result[id] = parseCachedChallengeInfo(value)
  }
  return result
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

  const wireLeaderboard: string[] = []
  for (const userInfo of data.users) {
    wireLeaderboard.push(
      userInfo.id,
      userInfo.name,
      userInfo.division ?? '',
      userInfo.score.toString()
    )
  }

  const wireChallengeInfos: string[] = []
  for (const [id, challengeInfo] of data.challengeInfos.entries()) {
    wireChallengeInfos.push(
      id,
      JSON.stringify({
        name: challengeInfo.name,
        category: challengeInfo.category,
        score: challengeInfo.score,
        solves: challengeInfo.solves,
      })
    )
  }

  const argv: string[] = [
    data.leaderboardUpdate.toString(),
    divisions.length.toString(),
    ...divisions,
    wireLeaderboard.length.toString(),
    ...wireLeaderboard,
    wireChallengeInfos.length.toString(),
    ...wireChallengeInfos,
  ]

  await redis.rctfSetLeaderboard(keys.length, ...keys, ...argv)
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

  await redis.rctfSetGraph(2, keyGraphUpdate, keyGraphData, ...argv)
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
    keyGraphData,
    limit.toString()
  )

  const parsed = JSON.parse(json) as [string, string[], (string | null)[]]

  const lastUpdate = Number.parseInt(parsed[0] ?? '0')
  const latest = parsed[1] ?? []
  const graphData = parsed[2] ?? []

  const result: Array<GraphEntry> = []
  for (let i = 0; i < latest.length; i += 3) {
    const id = latest[i] ?? ''
    const name = latest[i + 1] ?? ''
    const curScore = Number.parseInt(latest[i + 2] ?? '0')

    const userIdx = Math.floor(i / 3)
    const packedPoints = graphData[userIdx]

    const points: Array<GraphPoint> = []
    if (lastUpdate > 0) {
      points.push({ time: lastUpdate, score: curScore })
    }

    if (packedPoints) {
      const parts = packedPoints.split(',')
      for (let j = 0; j < parts.length; j += 2) {
        points.push({
          time: Number.parseInt(parts[j] ?? '0'),
          score: Number.parseInt(parts[j + 1] ?? '0'),
        })
      }
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

export const getLeaderboardWithChallenges = async (
  redis: TypedRedis,
  limit: number,
  offset: number,
  division?: string
): Promise<
  LeaderboardResult & { challenges: Record<string, CachedChallengeInfo> }
> => {
  const key = keyLeaderboard(division)
  const includeRange = limit > 0
  const start = offset * keysPerUser
  const end = start + limit * keysPerUser - 1

  const [range, totalRaw, challengeEntries] =
    await redis.rctfGetLeaderboardWithChallenges(
      key,
      keyChallengeInfo,
      start.toString(),
      end.toString(),
      includeRange ? '1' : '0'
    )

  const leaderboard: LeaderboardResult['leaderboard'] = []
  if (includeRange) {
    for (let i = 0; i < range.length; i += keysPerUser) {
      leaderboard.push({
        id: range[i] ?? '',
        name: range[i + 1] ?? '',
        score: Number.parseInt(range[i + 2] ?? '0'),
      })
    }
  }

  return {
    total: Math.floor(Number(totalRaw ?? 0) / keysPerUser),
    leaderboard,
    challenges: parseChallengeInfoEntries(challengeEntries),
  }
}

export const getChallengeDynamicPointsValue = async (
  redis: TypedRedis,
  challengeIds: string[]
): Promise<Array<CachedChallengeInfo>> => {
  if (challengeIds.length === 0) {
    return []
  }

  const redisResult = await redis.hmget(keyChallengeInfo, ...challengeIds)
  return redisResult.map(info => parseCachedChallengeInfo(info))
}

export const getCachedChallenges = async (
  redis: TypedRedis
): Promise<Record<string, CachedChallengeInfo>> => {
  const result = await redis.hgetall(keyChallengeInfo)
  const entries = Object.entries(result ?? {})

  return Object.fromEntries(
    entries.map(([id, value]) => [id, parseCachedChallengeInfo(value)])
  )
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
