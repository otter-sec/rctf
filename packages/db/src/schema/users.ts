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
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    avatarUrl: text('avatar_url'),
    countryCode: text('country_code'),
    statusText: text('status_text'),
    score: integer().notNull().default(0),
    globalRank: integer('global_rank'),
    divisionRank: integer('division_rank'),
    lastSolveAt: timestamp('last_solve_at', {
      withTimezone: true,
      mode: 'string',
    }),
    lastTiebreakSolveAt: timestamp('last_tiebreak_solve_at', {
      withTimezone: true,
      mode: 'string',
    }),
  },
  table => [
    index('users_created_at_index').using(
      'btree',
      table.createdAt.asc().nullsLast().op('timestamptz_ops')
    ),
    index('users_division_index').using(
      'btree',
      table.division.asc().nullsLast().op('text_ops')
    ),
    index('users_email_index')
      .using('btree', table.email.asc().nullsLast().op('text_ops'))
      .where(sql`${table.email} IS NOT NULL`),
    unique('users_name_key').on(table.name),
    unique('users_email_key').on(table.email),
    unique('users_ctftime_id_key').on(table.ctftimeId),
    index('users_name_trgm_idx').using('gin', sql`${table.name} gin_trgm_ops`),
    check(
      'require_email_or_ctftime_id',
      sql`(email IS NOT NULL) OR (ctftime_id IS NOT NULL)`
    ),
    index('users_global_leaderboard_idx')
      .using('btree', sql`global_rank ASC`)
      .where(sql`global_rank IS NOT NULL`),
    index('users_division_leaderboard_idx')
      .using('btree', sql`division, global_rank ASC`)
      .where(sql`global_rank IS NOT NULL`),
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
    unique('user_members_userid_email_key').on(table.userid, table.email),
  ]
)
