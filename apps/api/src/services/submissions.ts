import type { DatabaseClient, SubmissionDetails } from '@rctf/db'
import { challenges, submissions, users } from '@rctf/db'
import {
  SubmissionSortBy,
  SubmissionSortOrder,
  SubmissionTeamStatus,
  type SubmissionKind,
  type SubmissionResult,
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
  type SQL,
} from 'drizzle-orm'

export const createSubmission = async (
  db: DatabaseClient,
  params: {
    kind: SubmissionKind
    challengeId: string
    userId: string
    ip: string | undefined
    result: SubmissionResult
    details?: SubmissionDetails
    relatedId?: string | null
  }
): Promise<void> => {
  await db.insert(submissions).values({
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

export const getSubmissions = async (
  db: DatabaseClient,
  params: {
    limit: number
    offset: number
    sortBy?: SubmissionSortBy
    sortOrder?: SubmissionSortOrder
    challengeIds?: string[]
    excludeChallengeIds?: string[]
    challengeSearch?: string
    userIds?: string[]
    excludeUserIds?: string[]
    teamSearch?: string
    kinds?: SubmissionKind[]
    excludeKinds?: SubmissionKind[]
    results?: SubmissionResult[]
    excludeResults?: SubmissionResult[]
    teamStatuses?: SubmissionTeamStatus[]
    excludeTeamStatuses?: SubmissionTeamStatus[]
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
    filters.push(inArray(submissions.challengeId, params.challengeIds))
  }
  if (params.excludeChallengeIds?.length) {
    filters.push(
      notInArray(submissions.challengeId, params.excludeChallengeIds)
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
    filters.push(inArray(submissions.userId, params.userIds))
  }
  if (params.excludeUserIds?.length) {
    filters.push(notInArray(submissions.userId, params.excludeUserIds))
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
    filters.push(inArray(submissions.kind, params.kinds))
  }
  if (params.excludeKinds?.length) {
    filters.push(notInArray(submissions.kind, params.excludeKinds))
  }

  if (params.results?.length) {
    filters.push(inArray(submissions.result, params.results))
  }
  if (params.excludeResults?.length) {
    filters.push(notInArray(submissions.result, params.excludeResults))
  }
  if (params.createdAfter) {
    filters.push(gte(submissions.createdAt, params.createdAfter))
  }
  if (params.createdBefore) {
    filters.push(lte(submissions.createdAt, params.createdBefore))
  }

  const where = filters.length ? and(...filters) : undefined
  const sortBy = params.sortBy ?? SubmissionSortBy.CREATED_AT
  const sortOrder = params.sortOrder ?? SubmissionSortOrder.DESC
  const direction = sortOrder === SubmissionSortOrder.ASC ? asc : desc

  const sortColumn = (() => {
    switch (sortBy) {
      case SubmissionSortBy.CHALLENGE:
        return sql<string>`lower(${challenges.data} ->> 'name')`
      case SubmissionSortBy.TEAM:
        return sql<string>`lower(${users.name}::text)`
      case SubmissionSortBy.IP:
        return submissions.ip
      case SubmissionSortBy.KIND:
        return submissions.kind
      case SubmissionSortBy.RESULT:
        return submissions.result
      case SubmissionSortBy.CREATED_AT:
        return submissions.createdAt
    }
  })()

  const orderBy =
    sortBy === SubmissionSortBy.CREATED_AT
      ? [direction(submissions.createdAt), direction(submissions.id)]
      : [
          direction(sortColumn),
          desc(submissions.createdAt),
          desc(submissions.id),
        ]

  const rows = await db
    .select({
      id: submissions.id,
      kind: submissions.kind,
      challengeId: submissions.challengeId,
      challengeName: sql<string>`coalesce(${challenges.data} ->> 'name', ${submissions.challengeId})`,
      challengeCategory: sql<string>`coalesce(${challenges.data} ->> 'category', 'deleted')`,
      userId: submissions.userId,
      userName: sql<string>`coalesce(${users.name}::text, ${submissions.userId})`,
      userDivision: sql<string>`coalesce(${users.division}, 'unknown')`,
      userAvatarUrl: users.avatarUrl,
      userCountryCode: users.countryCode,
      userStatusText: users.statusText,
      userBanned: sql<boolean>`coalesce(${users.banned}, false)`,
      ip: submissions.ip,
      result: submissions.result,
      details: submissions.details,
      relatedId: submissions.relatedId,
      createdAt: submissions.createdAt,
    })
    .from(submissions)
    .leftJoin(challenges, eq(challenges.id, submissions.challengeId))
    .leftJoin(users, eq(users.id, submissions.userId))
    .where(where)
    .orderBy(...orderBy)
    .limit(params.limit + 1)
    .offset(params.offset)

  const hasMore = rows.length > params.limit

  return {
    submissions: rows.slice(0, params.limit),
    hasMore,
  }
}

function isBannedStatus(status: SubmissionTeamStatus) {
  return status === SubmissionTeamStatus.BANNED
}
