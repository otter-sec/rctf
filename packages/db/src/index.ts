import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export * from './schema'

export type DatabaseClient = PostgresJsDatabase<typeof schema>
export type PostgresClient = ReturnType<typeof postgres>
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm'

// FIXME(es3n1n): shared type for db config
export const createDatabase = (
  params:
    | string
    | {
        host: string
        port: number
        user: string
        password: string
        database: string
      }
) => {
  let client: PostgresClient
  if (typeof params === 'string') {
    client = postgres(params)
  } else {
    client = postgres({
      host: params.host,
      port: params.port,
      user: params.user,
      password: params.password,
      database: params.database,
    })
  }

  const db: DatabaseClient = drizzle(client, { schema })
  return { client, db }
}
