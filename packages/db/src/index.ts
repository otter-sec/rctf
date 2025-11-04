import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import * as schema from './schema'

export * from './schema'

export type Database = PostgresJsDatabase<typeof schema>
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
