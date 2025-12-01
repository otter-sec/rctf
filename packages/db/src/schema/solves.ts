import {
  foreignKey,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const solves = pgTable(
  'solves',
  {
    id: text().primaryKey().notNull(),
    challengeid: text().notNull(),
    userid: text().notNull(),
    createdat: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
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
