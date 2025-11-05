import type { Context } from 'hono'
import type { Database } from '@rctf/db'
import type { PinoLogger } from 'hono-pino'

export type AppEnv = {
  Variables: {
    db: Database
    logger: PinoLogger
  }
}
export type ApiContext = Context<AppEnv>
