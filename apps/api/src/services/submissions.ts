import type { DatabaseClient, SubmissionDetails } from '@rctf/db'
import { challenges, submissions, users } from '@rctf/db'
import type {
  FilterAdminSubmissionsRouteV2,
  GetAdminSubmissionsRouteV2,
  RouteBody,
  RouteQuery,
  SubmissionKind,
  SubmissionResult,
} from '@rctf/types'
import {
  SubmissionSortBy,
  SubmissionSortOrder,
  SubmissionTeamStatus,
} from '@rctf/types'
import { and, asc, count, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'
import { setFilter } from '../lib/db-filters'

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

type AdminSubmissionsQuery = RouteQuery<typeof GetAdminSubmissionsRouteV2> &
  Partial<RouteBody<typeof FilterAdminSubmissionsRouteV2>>

const challengeCategoryExpr = sql<string>`${challenges.data} ->> 'category'`
const teamBannedExpr = sql<boolean>`coalesce(${users.banned}, false)`

const likePattern = (value: string) => `%${value.trim().toLowerCase()}%`

const buildSubmissionsFilters = (
  params: AdminSubmissionsQuery
): SQL | undefined => {
  const challengeSearch = params.challengeSearch?.trim()
  const teamSearch = params.teamSearch?.trim()

  return and(
    challengeSearch
      ? sql`(
          lower(${challenges.data} ->> 'name') like ${likePattern(challengeSearch)}
          or lower(${challengeCategoryExpr}) like ${likePattern(challengeSearch)}
        )`
      : undefined,
    teamSearch
      ? sql`lower(${users.name}::text) like ${likePattern(teamSearch)}`
      : undefined,
    ...setFilter(sql`${submissions.challengeId}`, params.challenge),
    ...setFilter(sql`${submissions.userId}`, params.team),
    ...setFilter(sql`${submissions.kind}`, params.kind),
    ...setFilter(sql`${submissions.result}`, params.result),
    ...setFilter(teamBannedExpr, {
      include: params.teamStatus?.include?.map(isBannedStatus),
      exclude: params.teamStatus?.exclude?.map(isBannedStatus),
    }),
    ...setFilter(challengeCategoryExpr, params.category),
    ...setFilter(sql`${users.division}`, params.division),
    params.createdAfter
      ? gte(submissions.createdAt, params.createdAfter)
      : undefined,
    params.createdBefore
      ? lte(submissions.createdAt, params.createdBefore)
      : undefined
  )
}

const buildSubmissionsOrderBy = (params: AdminSubmissionsQuery): SQL[] => {
  const sortBy = params.sortBy ?? SubmissionSortBy.CREATED_AT
  const dir = params.sortOrder === SubmissionSortOrder.ASC ? asc : desc

  const sortExpr: Record<SubmissionSortBy, SQL | PgColumn> = {
    [SubmissionSortBy.CHALLENGE]: sql`lower(${challenges.data} ->> 'name')`,
    [SubmissionSortBy.TEAM]: sql`lower(${users.name}::text)`,
    [SubmissionSortBy.IP]: submissions.ip,
    [SubmissionSortBy.KIND]: submissions.kind,
    [SubmissionSortBy.RESULT]: submissions.result,
    [SubmissionSortBy.CREATED_AT]: submissions.createdAt,
  }

  const tieDir = sortBy === SubmissionSortBy.CREATED_AT ? dir : desc
  return [
    dir(sortExpr[sortBy]),
    tieDir(submissions.createdAt),
    tieDir(submissions.id),
  ]
}

export type AdminSubmissionInfo = {
  id: string
  kind: SubmissionKind
  challengeId: string
  challengeName: string
  challengeCategory: string
  userId: string
  userName: string
  userDivision: string
  userAvatarUrl: string | null
  userCountryCode: string | null
  userStatusText: string | null
  userBanned: boolean
  ip: string
  result: SubmissionResult
  details: SubmissionDetails
  relatedId: string | null
  createdAt: string
}

export const getSubmissions = async (
  db: DatabaseClient,
  params: AdminSubmissionsQuery
): Promise<{ total: number; submissions: AdminSubmissionInfo[] }> => {
  const filters = buildSubmissionsFilters(params)
  const orderBy = buildSubmissionsOrderBy(params)

  const baseQuery = db
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
      userBanned: teamBannedExpr,
      ip: submissions.ip,
      result: submissions.result,
      details: submissions.details,
      relatedId: submissions.relatedId,
      createdAt: submissions.createdAt,
    })
    .from(submissions)
    .leftJoin(challenges, eq(challenges.id, submissions.challengeId))
    .leftJoin(users, eq(users.id, submissions.userId))
    .where(filters)
    .$dynamic()

  const [countResult, rows] = await Promise.all([
    db.select({ count: count() }).from(baseQuery.as('s')),
    baseQuery
      .orderBy(...orderBy)
      .limit(params.limit)
      .offset(params.offset),
  ])

  return { total: countResult[0]?.count ?? 0, submissions: rows }
}

function isBannedStatus(status: SubmissionTeamStatus) {
  return status === SubmissionTeamStatus.BANNED
}
