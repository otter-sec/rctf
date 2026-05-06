import { config } from '@rctf/config'
import type { DatabaseClient } from '@rctf/db'
import { adminBotJobs, submissions, type InstancerInstance } from '@rctf/db'
import { getErrorConstraint, takeUnique } from '@rctf/db/util'
import {
  AdminBotJobStatus,
  SubmissionKind,
  SubmissionResult,
} from '@rctf/types'
import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm'

const MAX_LOGS_PER_USER_CHALLENGE =
  config.adminBot?.maxLogsPerUserChallenge ?? 5

type PulledJob = Record<string, unknown> & {
  id: string
  challenge_id: string
  user_id: string
  status: string
  config_revision: string
  flag: string
  inputs: Record<string, string>
  instancer_instances: InstancerInstance[]
  timeout_ms: number
  created_at: string
  updated_at: string
}

interface JobWithQueuePosition {
  id: string
  status: string
  createdAt: string
  queuePosition: number | null
  logs: string | null
}

export const getLatestJob = async (
  db: DatabaseClient,
  challengeId: string,
  userId: string
): Promise<JobWithQueuePosition | undefined> => {
  return await db
    .select({
      id: adminBotJobs.id,
      status: adminBotJobs.status,
      createdAt: adminBotJobs.createdAt,
      queuePosition: sql<number | null>`
        CASE WHEN ${adminBotJobs.status} = ${AdminBotJobStatus.QUEUED} THEN (
          SELECT COUNT(*)::int + 1
          FROM ${adminBotJobs} q
          WHERE q.status = ${AdminBotJobStatus.QUEUED}
            AND q.created_at < ${adminBotJobs.createdAt}
        ) ELSE NULL END
      `.as('queue_position'),
      logs: adminBotJobs.logs,
    })
    .from(adminBotJobs)
    .where(
      and(
        eq(adminBotJobs.challengeId, challengeId),
        eq(adminBotJobs.userId, userId)
      )
    )
    .orderBy(desc(adminBotJobs.createdAt))
    .limit(1)
    .then(takeUnique)
}

type JobHistoryEntry = {
  id: string
  status: string
  createdAt: string
  hasLogs: boolean
}

export const getJobHistory = async (
  db: DatabaseClient,
  challengeId: string,
  userId: string
): Promise<JobHistoryEntry[]> => {
  // Return up to N jobs with logs, plus any between them
  return await db.execute<JobHistoryEntry>(sql`
    SELECT id, status, created_at AS "createdAt", (logs IS NOT NULL)::boolean AS "hasLogs"
    FROM admin_bot_jobs
    WHERE challenge_id = ${challengeId}
      AND user_id = ${userId}
      AND status IN ('completed', 'failed')
      AND created_at >= COALESCE(
        (
          SELECT created_at FROM admin_bot_jobs
          WHERE challenge_id = ${challengeId}
            AND user_id = ${userId}
            AND status IN ('completed', 'failed')
            AND logs IS NOT NULL
          ORDER BY created_at DESC
          LIMIT 1 OFFSET ${MAX_LOGS_PER_USER_CHALLENGE - 1}
        ),
        (
          SELECT MIN(created_at) FROM admin_bot_jobs
          WHERE challenge_id = ${challengeId}
            AND user_id = ${userId}
            AND status IN ('completed', 'failed')
            AND logs IS NOT NULL
        )
      )
    ORDER BY created_at DESC
  `)
}

export const getJobLogs = async (
  db: DatabaseClient,
  jobId: string,
  challengeId: string,
  userId: string
): Promise<string | null> => {
  const job = await db
    .select({ logs: adminBotJobs.logs })
    .from(adminBotJobs)
    .where(
      and(
        eq(adminBotJobs.id, jobId),
        eq(adminBotJobs.challengeId, challengeId),
        eq(adminBotJobs.userId, userId),
        isNotNull(adminBotJobs.logs)
      )
    )
    .limit(1)
    .then(takeUnique)
  return job?.logs ?? null
}

export const hasActiveJob = async (
  db: DatabaseClient,
  challengeId: string,
  userId: string
): Promise<boolean> => {
  const job = await db
    .select({ id: adminBotJobs.id })
    .from(adminBotJobs)
    .where(
      and(
        eq(adminBotJobs.challengeId, challengeId),
        eq(adminBotJobs.userId, userId),
        inArray(adminBotJobs.status, [
          AdminBotJobStatus.QUEUED,
          AdminBotJobStatus.RUNNING,
        ])
      )
    )
    .limit(1)
    .then(takeUnique)
  return job !== undefined
}

export const createJob = async (
  db: DatabaseClient,
  params: {
    challengeId: string
    userId: string
    configRevision: string
    flag: string
    inputs: Record<string, string>
    instancerInstances: InstancerInstance[]
    timeoutMs: number
    submissionIp: string | undefined
  }
) => {
  const id = crypto.randomUUID()
  const submissionId = crypto.randomUUID()
  const now = new Date().toISOString()

  const job = {
    id,
    challengeId: params.challengeId,
    userId: params.userId,
    status: AdminBotJobStatus.QUEUED,
    configRevision: params.configRevision,
    flag: params.flag,
    inputs: params.inputs,
    instancerInstances: params.instancerInstances,
    timeoutMs: params.timeoutMs,
    createdAt: now,
    updatedAt: now,
  }

  try {
    await db.transaction(async tx => {
      await tx.insert(adminBotJobs).values(job)
      await tx.insert(submissions).values({
        id: submissionId,
        kind: SubmissionKind.ADMIN_BOT,
        challengeId: params.challengeId,
        userId: params.userId,
        ip: params.submissionIp ?? 'unknown',
        result: SubmissionResult.QUEUED,
        details: {
          inputs: params.inputs,
          configRevision: params.configRevision,
          instancerInstances: params.instancerInstances,
        },
        relatedId: id,
        createdAt: now,
      })
    })
  } catch (error) {
    const constraintName = getErrorConstraint(error)
    if (constraintName === 'admin_bot_jobs_active_job_unique') {
      return undefined
    }
    throw error
  }
  return job
}

export const getQueueDepth = async (db: DatabaseClient): Promise<number> => {
  const result = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(adminBotJobs)
    .where(eq(adminBotJobs.status, AdminBotJobStatus.QUEUED))
    .then(takeUnique)
  return result?.count ?? 0
}

export const pullNextJob = async (
  db: DatabaseClient
): Promise<PulledJob | undefined> => {
  return await db
    .execute<PulledJob>(
      sql`
      WITH stale AS (
        UPDATE admin_bot_jobs
        SET status = 'failed', updated_at = now()
        WHERE status = 'running'
          AND updated_at < now() - make_interval(secs => timeout_ms * 4.0 / 1000)
      ),
      picked AS (
        SELECT id FROM admin_bot_jobs
        WHERE status = 'queued'
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE admin_bot_jobs
      SET status = 'running', updated_at = now()
      FROM picked
      WHERE admin_bot_jobs.id = picked.id
      RETURNING admin_bot_jobs.*
    `
    )
    .then(takeUnique)
}

interface UpdatedJob {
  id: string
  challengeId: string
  userId: string
}

const finishJob = async (
  db: DatabaseClient,
  jobId: string,
  status: AdminBotJobStatus.COMPLETED | AdminBotJobStatus.FAILED,
  logs?: string
): Promise<UpdatedJob | undefined> => {
  return await db.transaction(async tx => {
    const job = await tx
      .update(adminBotJobs)
      .set({
        status,
        updatedAt: new Date().toISOString(),
        ...(logs !== undefined && { logs }),
      })
      .where(
        and(
          eq(adminBotJobs.id, jobId),
          eq(adminBotJobs.status, AdminBotJobStatus.RUNNING)
        )
      )
      .returning({
        id: adminBotJobs.id,
        challengeId: adminBotJobs.challengeId,
        userId: adminBotJobs.userId,
      })
      .then(takeUnique)

    if (job && logs) {
      await tx.execute(sql`
        UPDATE admin_bot_jobs
        SET logs = NULL
        WHERE challenge_id = ${job.challengeId}
          AND user_id = ${job.userId}
          AND logs IS NOT NULL
          AND id NOT IN (
            SELECT id FROM admin_bot_jobs
            WHERE challenge_id = ${job.challengeId}
              AND user_id = ${job.userId}
              AND logs IS NOT NULL
            ORDER BY created_at DESC
            LIMIT ${MAX_LOGS_PER_USER_CHALLENGE}
          )
      `)
    }

    return job
  })
}

export const completeJob = (
  db: DatabaseClient,
  jobId: string,
  logs?: string
): Promise<UpdatedJob | undefined> =>
  finishJob(db, jobId, AdminBotJobStatus.COMPLETED, logs)

export const failJob = (
  db: DatabaseClient,
  jobId: string,
  logs?: string
): Promise<UpdatedJob | undefined> =>
  finishJob(db, jobId, AdminBotJobStatus.FAILED, logs)
