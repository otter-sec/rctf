import { index, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { citext } from '../db-types'

export const pendingUserVerifications = pgTable(
  'pending_user_verifications',
  {
    id: text().primaryKey().notNull(),
    token: text().notNull(),
    name: citext('name').notNull(),
    email: text().notNull(),
    division: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
  },
  table => [
    unique('pending_user_verifications_token_key').on(table.token),
    unique('pending_user_verifications_email_key').on(table.email),
    index('pending_user_verifications_created_at_index').using(
      'btree',
      table.createdAt.desc().nullsLast().op('timestamptz_ops')
    ),
    index('pending_user_verifications_expires_at_index').using(
      'btree',
      table.expiresAt.asc().nullsLast().op('timestamptz_ops')
    ),
  ]
)
