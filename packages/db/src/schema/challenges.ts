import { jsonb, pgTable, text } from 'drizzle-orm/pg-core'

export const challenges = pgTable('challenges', {
  id: text().primaryKey().notNull(),
  data: jsonb().notNull(),
})
