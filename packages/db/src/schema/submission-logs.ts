import { SubmissionLogKind, SubmissionLogResult } from '@rctf/types'
import { sql } from 'drizzle-orm'
import {
  foreignKey,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { challenges } from './challenges'
import { users } from './users'

export type SubmissionLogDetails = Record<string, unknown>

export const submissionLogKindEnum = pgEnum('submission_log_kind', [
  SubmissionLogKind.FLAG,
  SubmissionLogKind.ADMIN_BOT,
])

export const submissionLogResultEnum = pgEnum('submission_log_result', [
  SubmissionLogResult.CORRECT,
  SubmissionLogResult.INCORRECT,
  SubmissionLogResult.RATE_LIMITED,
  SubmissionLogResult.ALREADY_SOLVED,
  SubmissionLogResult.QUEUED,
  SubmissionLogResult.ACTIVE_JOB,
  SubmissionLogResult.INVALID_INPUT,
  SubmissionLogResult.BAD_INSTANCER_STATE,
])

export const submissionLogs = pgTable(
  'submission_logs',
  {
    id: text().primaryKey().notNull(),
    kind: submissionLogKindEnum().notNull(),
    challengeId: text('challenge_id').notNull(),
    userId: text('user_id').notNull(),
    ip: text().notNull(),
    result: submissionLogResultEnum().notNull(),
    details: jsonb()
      .$type<SubmissionLogDetails>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    relatedId: text('related_id'),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'string',
    })
      .defaultNow()
      .notNull(),
  },
  table => [
    index('submission_logs_created_at_index').using(
      'btree',
      table.createdAt.desc().nullsLast().op('timestamptz_ops')
    ),
    index('submission_logs_challenge_created_at_index').using(
      'btree',
      table.challengeId.asc().nullsLast().op('text_ops'),
      table.createdAt.desc().nullsLast().op('timestamptz_ops')
    ),
    index('submission_logs_user_created_at_index').using(
      'btree',
      table.userId.asc().nullsLast().op('text_ops'),
      table.createdAt.desc().nullsLast().op('timestamptz_ops')
    ),
    index('submission_logs_ip_index').using(
      'btree',
      table.ip.asc().nullsLast().op('text_ops')
    ),
    index('submission_logs_kind_result_index').using(
      'btree',
      table.kind.asc().nullsLast(),
      table.result.asc().nullsLast()
    ),
    foreignKey({
      columns: [table.challengeId],
      foreignColumns: [challenges.id],
      name: 'submission_logs_challenge_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'submission_logs_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ]
)
