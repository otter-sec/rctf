import { relations } from 'drizzle-orm'
import {
  challenges,
  solves,
  submissionLogs,
  userMembers,
  users,
} from './schema'

export const solvesRelations = relations(solves, ({ one }) => ({
  user: one(users, {
    fields: [solves.userid],
    references: [users.id],
  }),
}))

export const usersRelations = relations(users, ({ many }) => ({
  solves: many(solves),
  submissionLogs: many(submissionLogs),
  userMembers: many(userMembers),
}))

export const userMembersRelations = relations(userMembers, ({ one }) => ({
  user: one(users, {
    fields: [userMembers.userid],
    references: [users.id],
  }),
}))

export const submissionLogsRelations = relations(submissionLogs, ({ one }) => ({
  challenge: one(challenges, {
    fields: [submissionLogs.challengeId],
    references: [challenges.id],
  }),
  user: one(users, {
    fields: [submissionLogs.userId],
    references: [users.id],
  }),
}))
