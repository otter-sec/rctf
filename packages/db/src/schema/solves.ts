import { sql } from 'drizzle-orm'
import {
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const solveSourceValues = ['flag', 'feed'] as const
export type SolveSource = (typeof solveSourceValues)[number]

export const solves = pgTable(
  'solves',
  {
    id: text().primaryKey().notNull(),
    challengeid: text().notNull(),
    userid: text().notNull(),
    createdat: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
    submissionip: text(),
    points: integer().notNull().default(0),
    pointsUpdatedAt: timestamp('points_updated_at', {
      withTimezone: true,
      mode: 'string',
    })
      .defaultNow()
      .notNull(),
    source: text().$type<SolveSource>().notNull().default('flag'),
  },
  table => [
    index().using(
      'btree',
      table.createdat.asc().nullsLast().op('timestamptz_ops')
    ),
    index().using('btree', table.userid.asc().nullsLast().op('text_ops')),
    index().using('btree', table.challengeid.asc().nullsLast().op('text_ops')),
    index().using(
      'btree',
      table.challengeid.asc().nullsLast().op('text_ops'),
      table.createdat.asc().nullsLast().op('timestamptz_ops')
    ),
    index('solves_userid_challengeid_index').using(
      'btree',
      table.userid.asc().nullsLast().op('text_ops'),
      table.challengeid.asc().nullsLast().op('text_ops')
    ),
    index('solves_points_updated_at_index')
      .using('btree', table.pointsUpdatedAt.asc().op('timestamptz_ops'))
      .where(sql`points > 0`),
    foreignKey({
      columns: [table.userid],
      foreignColumns: [users.id],
      name: 'uuid_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    unique('uq').on(table.challengeid, table.userid),
  ]
)
