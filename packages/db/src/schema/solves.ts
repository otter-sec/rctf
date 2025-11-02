import { pgTable, text, timestamp, primaryKey, index } from 'drizzle-orm/pg-core'
import { users } from './users'
import { challenges } from './challenges'

export const solves = pgTable(
  'solves',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    challengeId: text('challenge_id')
      .notNull()
      .references(() => challenges.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.challengeId] }),
    index('solves_user_id_idx').on(table.userId),
    index('solves_challenge_id_idx').on(table.challengeId),
    index('solves_created_at_idx').on(table.createdAt),
  ]
)
