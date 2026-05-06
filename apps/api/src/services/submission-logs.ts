import type { DatabaseClient, SubmissionLogDetails } from '@rctf/db'
import { challenges, submissionLogs, users } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import type { SubmissionLogKind, SubmissionLogResult } from '@rctf/types'
import { and, asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm'

export type SubmissionLogSortBy =
  | 'createdAt'
  | 'challenge'
  | 'team'
  | 'ip'
  | 'kind'
  | 'result'

export type SubmissionLogSortOrder = 'asc' | 'desc'

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
    challengeId?: string
    challengeIds?: string
    challengeSearch?: string
    userId?: string
    userIds?: string
    teamSearch?: string
    kind?: SubmissionLogKind
    result?: SubmissionLogResult
    results?: string
  }
) => {
  const filters: SQL[] = []
  if (params.challengeId) {
    filters.push(eq(submissionLogs.challengeId, params.challengeId))
  }
  const challengeIds =
    params.challengeIds
      ?.split(',')
      .map(id => id.trim())
      .filter(Boolean) ?? []
  if (challengeIds.length > 0) {
    filters.push(inArray(submissionLogs.challengeId, challengeIds))
  }
  if (params.challengeSearch?.trim()) {
    const pattern = `%${params.challengeSearch.trim().toLowerCase()}%`
    filters.push(sql`(
      lower(${challenges.data} ->> 'name') like ${pattern}
      or lower(${challenges.data} ->> 'category') like ${pattern}
    )`)
  }
  if (params.userId) {
    filters.push(eq(submissionLogs.userId, params.userId))
  }
  const userIds =
    params.userIds
      ?.split(',')
      .map(id => id.trim())
      .filter(Boolean) ?? []
  if (userIds.length > 0) {
    filters.push(inArray(submissionLogs.userId, userIds))
  }
  if (params.teamSearch?.trim()) {
    const pattern = `%${params.teamSearch.trim().toLowerCase()}%`
    filters.push(sql`lower(${users.name}::text) like ${pattern}`)
  }
  if (params.kind) {
    filters.push(eq(submissionLogs.kind, params.kind))
  }
  if (params.result) {
    filters.push(eq(submissionLogs.result, params.result))
  }
  const results =
    params.results
      ?.split(',')
      .map(result => result.trim())
      .filter(Boolean) ?? []
  if (results.length > 0) {
    filters.push(inArray(submissionLogs.result, results))
  }

  const where = filters.length ? and(...filters) : sql`true`
  const sortOrder = params.sortOrder ?? 'desc'
  const direction = sortOrder === 'asc' ? asc : desc
  const fallbackDirection = sortOrder === 'asc' ? asc : desc

  const sortColumn = (() => {
    switch (params.sortBy ?? 'createdAt') {
      case 'challenge':
        return sql<string>`lower(${challenges.data} ->> 'name')`
      case 'team':
        return sql<string>`lower(${users.name}::text)`
      case 'ip':
        return submissionLogs.ip
      case 'kind':
        return submissionLogs.kind
      case 'result':
        return submissionLogs.result
      case 'createdAt':
        return submissionLogs.createdAt
    }
  })()

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
      .orderBy(
        direction(sortColumn),
        fallbackDirection(submissionLogs.createdAt)
      )
      .limit(params.limit)
      .offset(params.offset),
    db
      .select({ total: sql<number>`COUNT(*)::int` })
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
