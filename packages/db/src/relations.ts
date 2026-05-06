import { relations } from 'drizzle-orm'
import { challenges, solves, submissions, userMembers, users } from './schema'

export const solvesRelations = relations(solves, ({ one }) => ({
  user: one(users, {
    fields: [solves.userid],
    references: [users.id],
  }),
}))

export const usersRelations = relations(users, ({ many }) => ({
  solves: many(solves),
  submissions: many(submissions),
  userMembers: many(userMembers),
}))

export const userMembersRelations = relations(userMembers, ({ one }) => ({
  user: one(users, {
    fields: [userMembers.userid],
    references: [users.id],
  }),
}))

export const submissionsRelations = relations(submissions, ({ one }) => ({
  challenge: one(challenges, {
    fields: [submissions.challengeId],
    references: [challenges.id],
  }),
  user: one(users, {
    fields: [submissions.userId],
    references: [users.id],
  }),
}))
