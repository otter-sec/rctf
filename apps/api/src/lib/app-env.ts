import type { DatabaseClient, PostgresClient } from '@rctf/db'
import type { Context } from 'hono'
import type { PinoLogger } from 'hono-pino'

export type AppEnv = {
  Variables: {
    pg: PostgresClient
    db: DatabaseClient
    logger: PinoLogger
  }
}
export type ApiContext = Context<AppEnv>
