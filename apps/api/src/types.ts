import type { db } from '@rctf/db'
import type { InferSelectModel } from '@rctf/db'
import { users } from '@rctf/db'

export type DatabaseClient = typeof db

export type DbUser = InferSelectModel<typeof users>

export type AppEnv = {
  Variables: {
    db: DatabaseClient
  }
}
