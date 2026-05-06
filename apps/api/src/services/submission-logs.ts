import type { DatabaseClient, SubmissionLogDetails } from '@rctf/db'
import { challenges, submissionLogs, users } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import {
  SubmissionLogSortBy,
  SubmissionLogSortOrder,
  type SubmissionLogKind,
  type SubmissionLogResult,
} from '@rctf/types'
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  sql,
  count as sqlCount,
  type SQL,
} from 'drizzle-orm'

export const createSubmissionLog = async (
  db: DatabaseClient,
  params: {
    kind: SubmissionLogKind
    challengeId: string
    userId: string
    ip: string | undefined
    result: SubmissionLogResult
    details?: SubmissionLogDetails
    relatedId?: string | null
  }
): Promise<void> => {
  await db.insert(submissionLogs).values({
    id: crypto.randomUUID(),
    kind: params.kind,
    challengeId: params.challengeId,
    userId: params.userId,
    ip: params.ip ?? 'unknown',
    result: params.result,
    details: params.details ?? {},
    relatedId: params.relatedId ?? null,
    createdAt: new Date().toISOString(),
  })
}

export const getSubmissionLogs = async (
  db: DatabaseClient,
  params: {
    limit: number
    offset: number
    sortBy?: SubmissionLogSortBy
    sortOrder?: SubmissionLogSortOrder
    challengeIds?: string[]
    challengeSearch?: string
    userIds?: string[]
    teamSearch?: string
    kind?: SubmissionLogKind
    results?: SubmissionLogResult[]
  }
) => {
  const filters: SQL[] = []
  if (params.challengeIds?.length) {
    filters.push(inArray(submissionLogs.challengeId, params.challengeIds))
  }

  if (params.challengeSearch?.trim()) {
    const pattern = `%${params.challengeSearch.trim().toLowerCase()}%`
    filters.push(sql`(
      lower(${challenges.data} ->> 'name') like ${pattern}
      or lower(${challenges.data} ->> 'category') like ${pattern}
    )`)
  }

  if (params.userIds?.length) {
    filters.push(inArray(submissionLogs.userId, params.userIds))
  }

  if (params.teamSearch?.trim()) {
    const pattern = `%${params.teamSearch.trim().toLowerCase()}%`
    filters.push(sql`lower(${users.name}::text) like ${pattern}`)
  }

  if (params.kind) {
    filters.push(eq(submissionLogs.kind, params.kind))
  }

  if (params.results?.length) {
    filters.push(inArray(submissionLogs.result, params.results))
  }

  const where = filters.length ? and(...filters) : undefined
  const sortBy = params.sortBy ?? SubmissionLogSortBy.CREATED_AT
  const sortOrder = params.sortOrder ?? SubmissionLogSortOrder.DESC
  const direction = sortOrder === SubmissionLogSortOrder.ASC ? asc : desc

  const sortColumn = (() => {
    switch (sortBy) {
      case SubmissionLogSortBy.CHALLENGE:
        return sql<string>`lower(${challenges.data} ->> 'name')`
      case SubmissionLogSortBy.TEAM:
        return sql<string>`lower(${users.name}::text)`
      case SubmissionLogSortBy.IP:
        return submissionLogs.ip
      case SubmissionLogSortBy.KIND:
        return submissionLogs.kind
      case SubmissionLogSortBy.RESULT:
        return submissionLogs.result
      case SubmissionLogSortBy.CREATED_AT:
        return submissionLogs.createdAt
    }
  })()

  const orderBy =
    sortBy === SubmissionLogSortBy.CREATED_AT
      ? [direction(submissionLogs.createdAt), direction(submissionLogs.id)]
      : [
          direction(sortColumn),
          desc(submissionLogs.createdAt),
          desc(submissionLogs.id),
        ]

  const [rows, count] = await Promise.all([
    db
      .select({
        id: submissionLogs.id,
        kind: submissionLogs.kind,
        challengeId: submissionLogs.challengeId,
        challengeName: sql<string>`${challenges.data} ->> 'name'`,
        challengeCategory: sql<string>`${challenges.data} ->> 'category'`,
        userId: submissionLogs.userId,
        userName: users.name,
        userDivision: users.division,
        userAvatarUrl: users.avatarUrl,
        userCountryCode: users.countryCode,
        userStatusText: users.statusText,
        userBanned: users.banned,
        ip: submissionLogs.ip,
        result: submissionLogs.result,
        details: submissionLogs.details,
        relatedId: submissionLogs.relatedId,
        createdAt: submissionLogs.createdAt,
      })
      .from(submissionLogs)
      .innerJoin(challenges, eq(challenges.id, submissionLogs.challengeId))
      .innerJoin(users, eq(users.id, submissionLogs.userId))
      .where(where)
      .orderBy(...orderBy)
      .limit(params.limit)
      .offset(params.offset),
    db
      .select({ total: sqlCount() })
      .from(submissionLogs)
      .innerJoin(challenges, eq(challenges.id, submissionLogs.challengeId))
      .innerJoin(users, eq(users.id, submissionLogs.userId))
      .where(where)
      .then(takeUnique),
  ])

  return {
    logs: rows,
    total: count?.total ?? 0,
  }
}
