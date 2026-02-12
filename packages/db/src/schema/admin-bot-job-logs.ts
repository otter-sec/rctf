import {
  foreignKey,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { adminBotJobs } from './admin-bot-jobs'
import { challenges } from './challenges'
import { users } from './users'

export const adminBotJobLogs = pgTable(
  'admin_bot_job_logs',
  {
    challengeId: text('challenge_id').notNull(),
    userId: text('user_id').notNull(),
    jobId: text('job_id').notNull(),
    logs: text().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  table => [
    primaryKey({ columns: [table.challengeId, table.userId] }),
    foreignKey({
      columns: [table.challengeId],
      foreignColumns: [challenges.id],
      name: 'admin_bot_job_logs_challenge_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'admin_bot_job_logs_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.jobId],
      foreignColumns: [adminBotJobs.id],
      name: 'admin_bot_job_logs_job_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ]
)
