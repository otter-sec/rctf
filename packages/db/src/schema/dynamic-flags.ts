import { sql } from 'drizzle-orm'
import {
  boolean,
  foreignKey,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { challenges } from './challenges'
import { users } from './users'

export const dynamicFlags = pgTable(
  'dynamic_flags',
  {
    challengeId: text('challenge_id').notNull(),
    userId: text('user_id').notNull(),
    base: text().notNull(),
    flag: text().notNull(),
    allowDuplicate: boolean('allow_duplicate').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  table => [
    primaryKey({
      name: 'dynamic_flags_pkey',
      columns: [table.challengeId, table.userId, table.base],
    }),
    uniqueIndex('dynamic_flags_challenge_id_flag_key')
      .on(table.challengeId, table.flag)
      .where(sql`NOT ${table.allowDuplicate}`),
    index('dynamic_flags_challenge_id_flag_index').on(
      table.challengeId,
      table.flag
    ),
    foreignKey({
      columns: [table.challengeId],
      foreignColumns: [challenges.id],
      name: 'dynamic_flags_challenge_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'dynamic_flags_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ]
)
