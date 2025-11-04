import type { Database, InferSelectModel } from '@rctf/db'
import { users } from '@rctf/db'

export type DatabaseClient = Database

export type DbUser = InferSelectModel<typeof users>

export type AppEnv = {
  Variables: {
    db: DatabaseClient
  }
}
