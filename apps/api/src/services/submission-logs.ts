import type { DatabaseClient, SubmissionLogDetails } from '@rctf/db'
import { challenges, submissionLogs, users } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import {
  SubmissionLogSortBy,
  SubmissionLogSortOrder,
  SubmissionLogTeamStatus,
  type SubmissionLogKind,
  type SubmissionLogResult,
} from '@rctf/types'
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  lte,
  notInArray,
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
    excludeChallengeIds?: string[]
    challengeSearch?: string
    userIds?: string[]
    excludeUserIds?: string[]
    teamSearch?: string
    kinds?: SubmissionLogKind[]
    excludeKinds?: SubmissionLogKind[]
    results?: SubmissionLogResult[]
    excludeResults?: SubmissionLogResult[]
    teamStatuses?: SubmissionLogTeamStatus[]
    excludeTeamStatuses?: SubmissionLogTeamStatus[]
    categories?: string[]
    excludeCategories?: string[]
    divisions?: string[]
    excludeDivisions?: string[]
    createdAfter?: string
    createdBefore?: string
  }
) => {
  const filters: SQL[] = []
  const challengeCategory = sql<string>`${challenges.data} ->> 'category'`

  if (params.challengeIds?.length) {
    filters.push(inArray(submissionLogs.challengeId, params.challengeIds))
  }
  if (params.excludeChallengeIds?.length) {
    filters.push(
      notInArray(submissionLogs.challengeId, params.excludeChallengeIds)
    )
  }

  if (params.challengeSearch?.trim()) {
    const pattern = `%${params.challengeSearch.trim().toLowerCase()}%`
    filters.push(sql`(
      lower(${challenges.data} ->> 'name') like ${pattern}
      or lower(${challengeCategory}) like ${pattern}
    )`)
  }
  if (params.categories?.length) {
    filters.push(inArray(challengeCategory, params.categories))
  }
  if (params.excludeCategories?.length) {
    filters.push(notInArray(challengeCategory, params.excludeCategories))
  }

  if (params.userIds?.length) {
    filters.push(inArray(submissionLogs.userId, params.userIds))
  }
  if (params.excludeUserIds?.length) {
    filters.push(notInArray(submissionLogs.userId, params.excludeUserIds))
  }

  if (params.teamSearch?.trim()) {
    const pattern = `%${params.teamSearch.trim().toLowerCase()}%`
    filters.push(sql`lower(${users.name}::text) like ${pattern}`)
  }
  if (params.teamStatuses?.length) {
    filters.push(inArray(users.banned, params.teamStatuses.map(isBannedStatus)))
  }
  if (params.excludeTeamStatuses?.length) {
    filters.push(
      notInArray(users.banned, params.excludeTeamStatuses.map(isBannedStatus))
    )
  }
  if (params.divisions?.length) {
    filters.push(inArray(users.division, params.divisions))
  }
  if (params.excludeDivisions?.length) {
    filters.push(notInArray(users.division, params.excludeDivisions))
  }

  if (params.kinds?.length) {
    filters.push(inArray(submissionLogs.kind, params.kinds))
  }
  if (params.excludeKinds?.length) {
    filters.push(notInArray(submissionLogs.kind, params.excludeKinds))
  }

  if (params.results?.length) {
    filters.push(inArray(submissionLogs.result, params.results))
  }
  if (params.excludeResults?.length) {
    filters.push(notInArray(submissionLogs.result, params.excludeResults))
  }
  if (params.createdAfter) {
    filters.push(gte(submissionLogs.createdAt, params.createdAfter))
  }
  if (params.createdBefore) {
    filters.push(lte(submissionLogs.createdAt, params.createdBefore))
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

function isBannedStatus(status: SubmissionLogTeamStatus) {
  return status === SubmissionLogTeamStatus.BANNED
}
