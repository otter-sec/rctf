import type { SqlDatabaseSchema } from '@rctf/config'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { z } from 'zod/mini'
import * as schema from './schema'

export * from './schema'

export type DatabaseClient = PostgresJsDatabase<typeof schema>
export type DatabaseTx = Parameters<
  Parameters<DatabaseClient['transaction']>[0]
>[0]
export type PostgresClient = ReturnType<typeof postgres>
export type { InferSelectModel, InferInsertModel }

// Common types
export type Challenge = InferInsertModel<typeof schema.challenges>
export type Solve = InferInsertModel<typeof schema.solves>
export type User = InferInsertModel<typeof schema.users>
export type UserMember = InferInsertModel<typeof schema.userMembers>
export type AdminBotJob = InferInsertModel<typeof schema.adminBotJobs>
export type Settings = InferInsertModel<typeof schema.settings>
export type PendingUserVerification = InferInsertModel<
  typeof schema.pendingUserVerifications
>
export type Submission = InferInsertModel<typeof schema.submissions>
export type ScoreEvent = InferInsertModel<typeof schema.scoreEvents>
export type ExternalAuthClient = InferInsertModel<
  typeof schema.externalAuthClients
>

export type SqlConfig = z.infer<typeof SqlDatabaseSchema>

export const createDatabase = (params: SqlConfig) => {
  let client: PostgresClient
  if (typeof params === 'string') {
    client = postgres(params, { onnotice: () => {} })
  } else {
    client = postgres({
      host: params.host,
      port: params.port,
      user: params.user,
      password: params.password,
      database: params.database,
      max: params.maxPoolSize,
      idle_timeout: params.idleTimeout / 1000,
      connect_timeout: params.connectTimeout / 1000,
      onnotice: () => {},
    })
  }

  const db: DatabaseClient = drizzle(client, { schema })
  return { client, db }
}

// holds session-scoped advisory locks, so the connection must never be
// recycled
export const createSingleConnectionClient = (params: SqlConfig) =>
  typeof params === 'string'
    ? postgres(params, { max: 1, max_lifetime: null, onnotice: () => {} })
    : postgres({
        host: params.host,
        port: params.port,
        user: params.user,
        password: params.password,
        database: params.database,
        max: 1,
        max_lifetime: null,
        connect_timeout: params.connectTimeout / 1000,
        onnotice: () => {},
      })
