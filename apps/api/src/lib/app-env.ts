import type { Challenge, DatabaseClient, PostgresClient } from '@rctf/db'
import type { Context } from 'hono'
import type { PinoLogger } from 'hono-pino'
import type { TypedRedis } from '../cache/scripts'

export type DynamicChallengeContext = Pick<Challenge, 'id' | 'data'>

export type AppEnv = {
  Variables: {
    pg: PostgresClient
    db: DatabaseClient
    logger: PinoLogger
    redis: TypedRedis
    ip: string
    dynamicChallenge?: DynamicChallengeContext
  }
}
export type ApiContext = Context<AppEnv>
