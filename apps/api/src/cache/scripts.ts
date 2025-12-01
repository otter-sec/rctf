import path from 'node:path'
import type Redis from 'ioredis'

export type TypedRedis = Redis & {
  rctfSetLeaderboard: (keys: number, ...args: string[]) => Promise<void>
  rctfSetGraph: (keys: number, ...args: string[]) => Promise<void>
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
    limit: string
  ) => Promise<string>
  rctfGetRange: (
    leaderboardKey: string,
    start: string,
    end: string
  ) => Promise<string[]>
  rctfRateLimit: (key: string, limit: string, ttlMs: string) => Promise<number>
}

export const loadLuaCommands = async (redis: Redis): Promise<TypedRedis> => {
  const baseDir = path.resolve(import.meta.dir, './scripts')

  const loadLuaScript = async (name: string): Promise<string> => {
    return await Bun.file(path.join(baseDir, name)).text()
  }

  redis.defineCommand('rctfSetLeaderboard', {
    lua: await loadLuaScript('set-leaderboard.lua'),
  })
  redis.defineCommand('rctfGetLeaderboardWithChallenges', {
    numberOfKeys: 2,
    lua: await loadLuaScript('get-leaderboard-with-challenges.lua'),
  })
  redis.defineCommand('rctfSetGraph', {
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
  redis.defineCommand('rctfRateLimit', {
    numberOfKeys: 1,
    lua: await loadLuaScript('rate-limit.lua'),
  })

  return redis as TypedRedis
}
