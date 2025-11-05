import { createDatabase } from '@rctf/db'
import type { MiddlewareHandler } from 'hono'
import { config } from '../config'
import type { AppEnv } from '../lib/app-env'

const { client, db } = createDatabase(config.database.sql)
export const appEnvMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set('db', db)
  c.set('pg', client)
  await next()
}
