import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from '@rctf/db/schema'
import type { Database as DrizzleDatabase } from '@rctf/db'

export type PostgresClient = ReturnType<typeof postgres>

interface CreateDatabaseOptions {
  url: string
}

export const createDatabase = ({ url }: CreateDatabaseOptions) => {
  const client = postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  })

  const db: DrizzleDatabase = drizzle(client, { schema })

  return { client, db }
}
