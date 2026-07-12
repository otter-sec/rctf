import type { TypedRedis } from '@rctf/api/src/cache/scripts'
import type { DatabaseClient } from '@rctf/db'

export type CliContext = {
  db: DatabaseClient
  redis: TypedRedis
}

export const withDbAndRedis = async <T>(
  fn: (ctx: CliContext) => Promise<T>
): Promise<T> => {
  const { config } = await import('@rctf/config')
  const { createDatabase } = await import('@rctf/db')
  const { createRedis } = await import('@rctf/api/src/util/redis')

  const { client, db } = createDatabase(config.database.sql)
  const redis = await createRedis()

  try {
    return await fn({ db, redis })
  } finally {
    await redis.quit().catch(() => {})
    await client.end({ timeout: 1 }).catch(() => {})
  }
}
