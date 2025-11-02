import { pgTable, text, timestamp, primaryKey, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { users } from './users'

export const teams = pgTable(
  'teams',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    division: text('division').notNull(),
    owner: text('owner')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('teams_name_division_idx').on(table.name, table.division),
    index('teams_division_idx').on(table.division),
    index('teams_owner_idx').on(table.owner),
  ]
)

export const teamMembers = pgTable(
  'team_members',
  {
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.teamId, table.userId] }),
    index('team_members_team_id_idx').on(table.teamId),
    index('team_members_user_id_idx').on(table.userId),
  ]
)
