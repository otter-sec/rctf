import { config } from '@rctf/config'
import { createDatabase } from '@rctf/db'
import { RedisClient } from 'bun'
import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from '../lib/app-env'

const createRedis = (): RedisClient => {
  if (typeof config.database.redis == 'string') {
    return new RedisClient(config.database.redis)
  }
  // oh god...
  const params = config.database.redis
  const auth = params.password ? `:${encodeURIComponent(params.password)}@` : ''
  const hostPort = params.port ? `${params.host}:${params.port}` : params.host
  const db = params.database ? `/${params.database}` : ''
  return new RedisClient(`redis://${auth}${hostPort}${db}`)
}

const { client, db } = createDatabase(config.database.sql)
const redis = createRedis()

export const appEnvMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set('db', db)
  c.set('pg', client)
  c.set('redis', redis)
  await next()
}
