import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'
import { citext } from '../db-types'

export const users = pgTable(
  'users',
  {
    id: text().primaryKey().notNull(),
    name: citext('name').notNull(),
    email: text(),
    division: text().notNull(),
    perms: integer().notNull(),
    ctftimeId: text('ctftime_id'),
    discordId: text('discord_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    avatarUrl: text('avatar_url'),
  },
  table => [
    unique('users_name_key').on(table.name),
    unique('users_email_key').on(table.email),
    unique('users_ctftime_id_key').on(table.ctftimeId),
    check(
      'require_email_ctftime_id_or_discord_id',
      sql`(email IS NOT NULL) OR (ctftime_id IS NOT NULL) OR (discord_id IS NOT NULL)`
    ),
  ]
)

export const userMembers = pgTable(
  'user_members',
  {
    id: text().primaryKey().notNull(),
    userid: text().notNull(),
    email: text().notNull(),
  },
  table => [
    index().using('btree', table.userid.asc().nullsLast().op('text_ops')),
    foreignKey({
      columns: [table.userid],
      foreignColumns: [users.id],
      name: 'uuid_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    unique('user_members_email_key').on(table.email),
  ]
)
