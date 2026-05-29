import { foreignKey, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'

export const externalAuthClients = pgTable(
  'external_auth_clients',
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    redirectUri: text('redirect_uri').notNull(),
    secretHash: text('secret_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    createdBy: text('created_by'),
  },
  table => [
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'external_auth_clients_created_by_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
  ]
)
