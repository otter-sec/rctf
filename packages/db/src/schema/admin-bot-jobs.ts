import { sql } from 'drizzle-orm'
import {
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { challenges, type Remote } from './challenges'
import { users } from './users'

export interface InstancerInstance {
  type: string
  host: string
  port: number
  title?: string
}

export const adminBotJobStatusEnum = pgEnum('admin_bot_job_status', [
  'queued',
  'running',
  'completed',
  'failed',
])

export const adminBotJobs = pgTable(
  'admin_bot_jobs',
  {
    id: text().primaryKey().notNull(),
    challengeId: text('challenge_id').notNull(),
    userId: text('user_id').notNull(),
    status: adminBotJobStatusEnum().notNull(),
    configRevision: text('config_revision').notNull(),
    flag: text().notNull(),
    inputs: jsonb().$type<Record<string, string>>().notNull(),
    remotes: jsonb().$type<Remote[]>().notNull().default([]),
    instancerInstances: jsonb('instancer_instances')
      .$type<InstancerInstance[]>()
      .notNull(),
    timeoutMs: integer('timeout_ms').notNull(),
    logs: text(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  table => [
    index('admin_bot_jobs_user_id_index').using(
      'btree',
      table.userId.asc().nullsLast().op('text_ops')
    ),
    index('admin_bot_jobs_challenge_id_index').using(
      'btree',
      table.challengeId.asc().nullsLast().op('text_ops')
    ),
    index('admin_bot_jobs_status_created_at_index').using(
      'btree',
      table.status.asc().nullsLast(),
      table.createdAt.asc().nullsLast()
    ),
    uniqueIndex('admin_bot_jobs_active_job_unique')
      .on(table.userId, table.challengeId)
      .where(sql`status IN ('queued', 'running')`),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'admin_bot_jobs_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.challengeId],
      foreignColumns: [challenges.id],
      name: 'admin_bot_jobs_challenge_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ]
)
