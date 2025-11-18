import { config } from '@rctf/config'
import { Redis } from 'ioredis'
import { loadLuaCommands, type TypedRedis } from '../cache/scripts'

// Things we need from a redis library that bun doesn't have right now:
// - https://github.com/oven-sh/bun/issues/21404

export const createRedis = async (): Promise<TypedRedis> => {
  if (typeof config.database.redis == 'string') {
    return await loadLuaCommands(new Redis(config.database.redis))
  }

  return await loadLuaCommands(
    new Redis({
      host: config.database.redis.host,
      port: config.database.redis.port,
      password: config.database.redis.password,
      db: config.database.redis.database,
    })
  )
}
