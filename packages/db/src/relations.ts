import { users, solves, userMembers } from './schema'
import { relations } from 'drizzle-orm'

export const solvesRelations = relations(solves, ({ one }) => ({
  user: one(users, {
    fields: [solves.userid],
    references: [users.id],
  }),
}))

export const usersRelations = relations(users, ({ many }) => ({
  solves: many(solves),
  userMembers: many(userMembers),
}))

export const userMembersRelations = relations(userMembers, ({ one }) => ({
  user: one(users, {
    fields: [userMembers.userid],
    references: [users.id],
  }),
}))
