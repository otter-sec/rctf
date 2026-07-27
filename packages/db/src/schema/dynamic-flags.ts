import {
  foreignKey,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const dynamicFlags = pgTable(
  'dynamic_flags',
  {
    challengeId: text('challenge_id').notNull(),
    userId: text('user_id').notNull(),
    base: text().notNull(),
    flag: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  table => [
    primaryKey({
      name: 'dynamic_flags_pkey',
      columns: [table.challengeId, table.userId, table.base],
    }),
    index('dynamic_flags_challenge_id_flag_index').on(
      table.challengeId,
      table.flag
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'dynamic_flags_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ]
)
