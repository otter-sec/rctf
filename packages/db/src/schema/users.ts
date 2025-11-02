import { pgTable, text, integer, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').unique(),
    division: text('division').notNull(),
    perms: integer('perms').notNull().default(0),
    ctftimeId: integer('ctftime_id').unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('users_name_idx').on(table.name),
    index('users_division_idx').on(table.division),
    index('users_perms_idx').on(table.perms),
  ]
)
