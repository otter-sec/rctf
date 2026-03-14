import path from 'node:path'
import type Redis from 'ioredis'

export type TypedRedis = Redis & {
  rctfSetLeaderboard: (...args: string[]) => Promise<void>
  rctfSetGraph: (...args: string[]) => Promise<void>
  rctfGetLeaderboardWithChallenges: (
    leaderboardKey: string,
    challengeInfoKey: string,
    start: string,
    end: string,
    includeRange: string
  ) => Promise<[string[], number | string, string[]]>
  rctfGetGraph: (
    leaderboardKey: string,
    leaderboardUpdateKey: string,
    graphDataKey: string,
    limit: string,
    offset: string,
    isDivision: '1' | '0'
  ) => Promise<string>
  rctfGetRange: (
    leaderboardKey: string,
    start: string,
    end: string
  ) => Promise<string[]>
  rctfGetRangeWithScores: (
    leaderboardKey: string,
    scorePositionsKey: string,
    start: string,
    end: string,
    keysPerUser: string
  ) => Promise<[string[], number | string, (string | null)[]]>
  rctfRateLimit: (key: string, limit: string, ttlMs: string) => Promise<number>
}

export const loadLuaCommands = async (redis: Redis): Promise<TypedRedis> => {
  const baseDir = path.resolve(import.meta.dir, './scripts')

  const loadLuaScript = async (name: string): Promise<string> => {
    return await Bun.file(path.join(baseDir, name)).text()
  }

  redis.defineCommand('rctfSetLeaderboard', {
    numberOfKeys: 5,
    lua: await loadLuaScript('set-leaderboard.lua'),
  })
  redis.defineCommand('rctfGetLeaderboardWithChallenges', {
    numberOfKeys: 2,
    lua: await loadLuaScript('get-leaderboard-with-challenges.lua'),
  })
  redis.defineCommand('rctfSetGraph', {
    numberOfKeys: 2,
    lua: await loadLuaScript('set-graph.lua'),
  })
  redis.defineCommand('rctfGetGraph', {
    numberOfKeys: 3,
    lua: await loadLuaScript('get-graph.lua'),
  })
  redis.defineCommand('rctfGetRange', {
    numberOfKeys: 1,
    lua: await loadLuaScript('get-range.lua'),
  })
  redis.defineCommand('rctfGetRangeWithScores', {
    numberOfKeys: 2,
    lua: await loadLuaScript('get-range-with-scores.lua'),
  })
  redis.defineCommand('rctfRateLimit', {
    numberOfKeys: 1,
    lua: await loadLuaScript('rate-limit.lua'),
  })

  return redis as TypedRedis
}
