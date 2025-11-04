import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
// import { users } from './users'

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
