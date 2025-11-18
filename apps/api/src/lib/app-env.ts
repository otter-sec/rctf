import type { DatabaseClient, PostgresClient } from '@rctf/db'
import type { Context } from 'hono'
import type { PinoLogger } from 'hono-pino'
import type { TypedRedis } from '../cache/scripts'

export type AppEnv = {
  Variables: {
    pg: PostgresClient
    db: DatabaseClient
    logger: PinoLogger
    redis: TypedRedis
  }
}
export type ApiContext = Context<AppEnv>
