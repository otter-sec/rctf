import { config } from '@rctf/config'
import { createDatabase } from '@rctf/db'
import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from '../lib/app-env'
import { createRedis } from '../util/redis'

const { client, db } = createDatabase(config.database.sql)
const redis = await createRedis()

export const appEnvMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set('db', db)
  c.set('pg', client)
  c.set('redis', redis)
  await next()
}
