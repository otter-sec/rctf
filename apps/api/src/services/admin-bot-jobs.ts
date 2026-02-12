import type { DatabaseClient } from '@rctf/db'
import { adminBotJobLogs, adminBotJobs, type InstancerInstance } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import { AdminBotJobStatus } from '@rctf/types'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'

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
      logs: sql<string | null>`(
        SELECT ${adminBotJobLogs.logs}
        FROM ${adminBotJobLogs}
        WHERE ${adminBotJobLogs.challengeId} = ${adminBotJobs.challengeId}
          AND ${adminBotJobLogs.userId} = ${adminBotJobs.userId}
          AND ${adminBotJobLogs.jobId} = ${adminBotJobs.id}
      )`.as('logs'),
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
  }
) => {
  const id = crypto.randomUUID()
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

  await db.insert(adminBotJobs).values(job)
  return job
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

export const completeJob = async (
  db: DatabaseClient,
  jobId: string
): Promise<UpdatedJob | undefined> => {
  return await db
    .update(adminBotJobs)
    .set({
      status: AdminBotJobStatus.COMPLETED,
      updatedAt: new Date().toISOString(),
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
}

export const failJob = async (
  db: DatabaseClient,
  jobId: string
): Promise<UpdatedJob | undefined> => {
  return await db
    .update(adminBotJobs)
    .set({
      status: AdminBotJobStatus.FAILED,
      updatedAt: new Date().toISOString(),
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
}

// We store logs only from last submission
export const upsertJobLogs = async (
  db: DatabaseClient,
  params: {
    challengeId: string
    userId: string
    jobId: string
    logs: string
  }
): Promise<void> => {
  await db
    .insert(adminBotJobLogs)
    .values({
      challengeId: params.challengeId,
      userId: params.userId,
      jobId: params.jobId,
      logs: params.logs,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: [adminBotJobLogs.challengeId, adminBotJobLogs.userId],
      set: {
        jobId: params.jobId,
        logs: params.logs,
        updatedAt: new Date().toISOString(),
      },
    })
}
