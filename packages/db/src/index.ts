import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

export type Database = PostgresJsDatabase<typeof schema>
export type PostgresClient = ReturnType<typeof postgres>
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
export * from './schema'

export interface DatabaseCreationConfig {
  url: string
  max_connections: number
  idle_timeout_sec: number
  connect_timeout_sec: number
}

export const createDatabase = (params: DatabaseCreationConfig) => {
  const client = postgres(params.url, {
    max: params.max_connections,
    idle_timeout: params.idle_timeout_sec,
    connect_timeout: params.connect_timeout_sec,
  })
  const db: Database = drizzle(client, { schema })
  return { client, db }
}
