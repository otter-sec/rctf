import type { Context } from 'hono'
import type { Database } from '@rctf/db'

export type AppEnv = {
  Variables: {
    db: Database
  }
}
export type ApiContext = Context<AppEnv>
