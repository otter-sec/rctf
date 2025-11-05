import { createDatabase } from '@rctf/db'
import type { MiddlewareHandler } from 'hono'
import { config } from '../config'
import type { AppEnv } from '../lib/app-env'

const { client, db } = createDatabase({
  url: config.database.url,
  max_connections: config.database.maxConnections,
  idle_timeout_sec: config.database.idleTimeoutSeconds,
  connect_timeout_sec: config.database.connectTimeoutSeconds,
})

export const appEnvMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set('db', db)
  c.set('pg', client)
  await next()
}
