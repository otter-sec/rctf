import { createDatabase } from '@rctf/db'
import type { MiddlewareHandler } from 'hono'
import { config } from '../config'
import type { AppEnv } from '../lib/app-env'

let initialized: boolean = false
export const appEnvMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!initialized) {
    const { client, db } = createDatabase({
      url: config.database.url,
      max_connections: config.database.maxConnections,
      idle_timeout_sec: config.database.idleTimeoutSeconds,
      connect_timeout_sec: config.database.connectTimeoutSeconds,
    })

    c.set('db', db)
    c.set('pg', client)

    initialized = true
  }

  await next()
}
