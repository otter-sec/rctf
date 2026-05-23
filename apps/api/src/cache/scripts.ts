import path from 'node:path'
import type Redis from 'ioredis'

export type TypedRedis = Redis & {
  rctfMergeGraph: (...args: string[]) => Promise<void>
  rctfReplaceGraph: (...args: string[]) => Promise<void>
  rctfRateLimit: (key: string, limit: string, ttlMs: string) => Promise<number>
}

export const loadLuaCommands = async (redis: Redis): Promise<TypedRedis> => {
  const baseDir = path.resolve(import.meta.dir, './scripts')

  const loadLuaScript = async (name: string): Promise<string> => {
    return await Bun.file(path.join(baseDir, name)).text()
  }

  redis.defineCommand('rctfMergeGraph', {
    numberOfKeys: 5,
    lua: await loadLuaScript('set-graph.lua'),
  })
  redis.defineCommand('rctfReplaceGraph', {
    numberOfKeys: 5,
    lua: await loadLuaScript('replace-graph.lua'),
  })
  redis.defineCommand('rctfRateLimit', {
    numberOfKeys: 1,
    lua: await loadLuaScript('rate-limit.lua'),
  })

  return redis as TypedRedis
}
