import { config } from '@rctf/config'
import { Redis } from 'ioredis'
import { pino } from 'pino'
import { loadLuaCommands, type TypedRedis } from '../cache/scripts'

const logger = pino().child({ module: 'redis' })

// Things we need from a redis library that bun doesn't have right now:
// - https://github.com/oven-sh/bun/issues/21404

export function createRedis(opts?: { lua: true }): Promise<TypedRedis>
export function createRedis(opts: { lua: false }): Promise<Redis>
export async function createRedis(
  opts: { lua: boolean } = { lua: true }
): Promise<Redis | TypedRedis> {
  const redis =
    typeof config.database.redis === 'string'
      ? new Redis(config.database.redis)
      : new Redis({
          host: config.database.redis.host,
          port: config.database.redis.port,
          password: config.database.redis.password,
          db: config.database.redis.database,
        })
  redis.on('error', err => logger.error({ err }, 'redis client error'))
  return opts.lua ? await loadLuaCommands(redis) : redis
}
