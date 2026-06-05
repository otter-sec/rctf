import type { DatabaseClient, DatabaseTx, User } from '@rctf/db'
import { challenges, solves, users } from '@rctf/db'
import { getErrorConstraint, takeUnique } from '@rctf/db/util'
import type {
  BadEmailNoExists,
  BadUnknownUser,
  BadZeroAuth,
  GoodCtftimeAuthSet,
  GoodCtftimeRemoved,
  GoodEmailRemoved,
  GoodEmailSet,
  ResponseHelpers,
  RouteBody,
  RouteQuery,
} from '@rctf/types'
import {
  AdminTeamSortBy,
  AdminTeamStatus,
  BadKnownCtftimeId,
  BadKnownEmail,
  BadKnownName,
  FilterAdminUsersRouteV2,
  GetAdminUsersRouteV2,
  GoodRegister,
  GoodRegisterV2,
  SortOrder,
} from '@rctf/types'
import { and, asc, count, desc, eq, ne, or, sql, type SQL } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'
import { invalidateUserCache } from '../cache/auth-cache'
import type { TypedRedis } from '../cache/scripts'
import { setFilter } from '../lib/db-filters'
import { preparedPerDb } from '../lib/prepared'
import { createToken, TokenKind } from '../lib/tokens'
import { forceLeaderboardUpdate, requestChallengeRecompute } from '../workers'
import { isDecayKind } from './challenges'
import { getCompetitionTiming } from './settings'
import {
  emitBanScoreEvents,
  emitUserDeletionScoreEvents,
  type RecomputeSource,
} from './solve-points'

type CreateUserResponseHelpers = ResponseHelpers<
  [
    typeof BadKnownCtftimeId,
    typeof BadKnownEmail,
    typeof BadKnownName,
    typeof GoodRegister,
  ]
>

type CreateUserV2ResponseHelpers = ResponseHelpers<
  [
    typeof BadKnownCtftimeId,
    typeof BadKnownEmail,
    typeof BadKnownName,
    typeof GoodRegisterV2,
  ]
>

type UpdateUserEmailResponseHelpers = ResponseHelpers<
  [typeof BadUnknownUser, typeof BadKnownEmail, typeof GoodEmailSet]
>

type UpdateCtftimeIdResponseHelpers = ResponseHelpers<
  [typeof BadKnownCtftimeId, typeof GoodCtftimeAuthSet, typeof BadUnknownUser]
>

type DeleteEmailResponseHelpers = ResponseHelpers<
  [
    typeof BadEmailNoExists,
    typeof GoodEmailRemoved,
    typeof BadUnknownUser,
    typeof BadZeroAuth,
  ]
>

type DeleteCtftimeIdResponseHelpers = ResponseHelpers<
  [typeof GoodCtftimeRemoved, typeof BadUnknownUser, typeof BadZeroAuth]
>

export type CreateUserInternalResult =
  | {
      success: true
      userId: string
    }
  | {
      success: false
      error: 'badKnownCtftimeId' | 'badKnownEmail' | 'badKnownName'
    }

type CreateUserError = Extract<
  CreateUserInternalResult,
  { success: false }
>['error']

type CreateUserErrorResponseHelpers = ResponseHelpers<
  [typeof BadKnownCtftimeId, typeof BadKnownEmail, typeof BadKnownName]
>

type CreateUserErrorResponse = ReturnType<
  CreateUserErrorResponseHelpers[keyof CreateUserErrorResponseHelpers]
>

const createUserErrorResponse = (
  res: CreateUserErrorResponseHelpers,
  error: CreateUserError
): CreateUserErrorResponse => {
  if (error === 'badKnownCtftimeId') {
    return res.badKnownCtftimeId()
  }
  if (error === 'badKnownEmail') {
    return res.badKnownEmail()
  }
  return res.badKnownName()
}

export const createUserInternal = async (
  db: DatabaseClient,
  user: Pick<User, 'division' | 'email' | 'name' | 'ctftimeId'>
): Promise<CreateUserInternalResult> => {
  let created

  try {
    created = (
      await db
        .insert(users)
        .values({
          id: crypto.randomUUID(),
          perms: 0,
          ...user,
        })
        .returning({
          id: users.id,
        })
    )[0]!
  } catch (error) {
    const contraintName = getErrorConstraint(error)
    if (contraintName === 'users_ctftime_id_key') {
      return { success: false, error: 'badKnownCtftimeId' }
    }
    if (contraintName === 'users_email_key') {
      return { success: false, error: 'badKnownEmail' }
    }
    if (contraintName === 'users_name_key') {
      return { success: false, error: 'badKnownName' }
    }
    throw error
  }

  return { success: true, userId: created.id }
}

export const createUser = async (
  res: CreateUserResponseHelpers,
  db: DatabaseClient,
  user: Pick<User, 'division' | 'email' | 'name' | 'ctftimeId'>
): Promise<
  ReturnType<CreateUserResponseHelpers[keyof CreateUserResponseHelpers]>
> => {
  const result = await createUserInternal(db, user)
  if (!result.success) {
    return createUserErrorResponse(res, result.error)
  }

  const authToken = await createToken(TokenKind.Auth, result.userId)
  return res.goodRegister({ authToken })
}

export const createUserV2 = async (
  res: CreateUserV2ResponseHelpers,
  db: DatabaseClient,
  user: Pick<User, 'division' | 'email' | 'name' | 'ctftimeId'>
): Promise<
  ReturnType<CreateUserV2ResponseHelpers[keyof CreateUserV2ResponseHelpers]>
> => {
  const result = await createUserInternal(db, user)
  if (!result.success) {
    return createUserErrorResponse(res, result.error)
  }

  const [authToken, teamToken] = await Promise.all([
    createToken(TokenKind.Auth, result.userId),
    createToken(TokenKind.Team, result.userId),
  ])
  return res.goodRegisterV2({ authToken, teamToken })
}

export type UpdateUserResult =
  | { success: true; user: User }
  | { success: false; error: 'badDivisionChangeEnded' | 'badKnownName' }

export const updateUserInternal = async (
  db: DatabaseClient,
  redis: TypedRedis,
  user: Pick<User, 'id' | 'division'>,
  updates: Pick<User, 'division' | 'name' | 'countryCode' | 'statusText'>,
  opts: { bypassDivisionFreeze?: boolean } = {}
): Promise<UpdateUserResult> => {
  // divisions affect final standings, so they are frozen once the
  // competition ends
  if (!opts.bypassDivisionFreeze && updates.division !== user.division) {
    const { endTime } = await getCompetitionTiming(db, redis)

    if (Date.now() >= endTime) {
      return { success: false, error: 'badDivisionChangeEnded' }
    }
  }

  let updated

  try {
    updated = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, user.id))
      .returning()
      .then(takeUnique)
  } catch (error) {
    const contraintName = getErrorConstraint(error)
    if (contraintName === 'users_name_key') {
      return { success: false, error: 'badKnownName' }
    }
    throw error
  }

  await invalidateUserCache(redis, user.id)
  forceLeaderboardUpdate(redis)
  return { success: true, user: updated! }
}

export const updateUserEmail = async (
  res: UpdateUserEmailResponseHelpers,
  db: DatabaseClient,
  redis: TypedRedis,
  id: string,
  user: Pick<User, 'email'>
): Promise<
  ReturnType<
    UpdateUserEmailResponseHelpers[keyof UpdateUserEmailResponseHelpers]
  >
> => {
  let updated

  try {
    updated = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning()
      .then(takeUnique)
  } catch (error) {
    const contraintName = getErrorConstraint(error)
    if (contraintName === 'users_email_key') {
      return res.badKnownEmail()
    }
    throw error
  }

  if (!updated) {
    return res.badUnknownUser()
  }

  await invalidateUserCache(redis, id)
  return res.goodEmailSet()
}

export const deleteEmail = async (
  res: DeleteEmailResponseHelpers,
  db: DatabaseClient,
  redis: TypedRedis,
  id: string
): Promise<
  ReturnType<DeleteEmailResponseHelpers[keyof DeleteEmailResponseHelpers]>
> => {
  let updated

  try {
    updated = await db
      .update(users)
      .set({ email: null })
      .where(eq(users.id, id))
      .returning()
      .then(takeUnique)
  } catch (error) {
    const contraintName = getErrorConstraint(error)
    if (contraintName === 'require_email_or_ctftime_id') {
      return res.badZeroAuth()
    }
    throw error
  }

  if (!updated) {
    return res.badUnknownUser()
  }

  await invalidateUserCache(redis, id)
  return res.goodEmailRemoved()
}

export const updateCtftimeId = async (
  res: UpdateCtftimeIdResponseHelpers,
  db: DatabaseClient,
  redis: TypedRedis,
  id: string,
  ctftimeId: string
): Promise<
  ReturnType<
    UpdateCtftimeIdResponseHelpers[keyof UpdateCtftimeIdResponseHelpers]
  >
> => {
  let updated

  try {
    updated = await db.update(users).set({ ctftimeId }).where(eq(users.id, id))
  } catch (error) {
    const contraintName = getErrorConstraint(error)
    if (contraintName === 'users_ctftime_id_key') {
      return res.badKnownCtftimeId()
    }
    throw error
  }

  if (!updated) {
    return res.badUnknownUser()
  }

  await invalidateUserCache(redis, id)
  return res.goodCtftimeAuthSet()
}

export const deleteCtftimeId = async (
  res: DeleteCtftimeIdResponseHelpers,
  db: DatabaseClient,
  redis: TypedRedis,
  id: string
): Promise<
  ReturnType<
    DeleteCtftimeIdResponseHelpers[keyof DeleteCtftimeIdResponseHelpers]
  >
> => {
  let updated

  try {
    updated = await db
      .update(users)
      .set({ ctftimeId: null })
      .where(eq(users.id, id))
  } catch (error) {
    const contraintName = getErrorConstraint(error)
    if (contraintName === 'require_email_or_ctftime_id') {
      return res.badZeroAuth()
    }
    throw error
  }

  if (!updated) {
    return res.badUnknownUser()
  }

  await invalidateUserCache(redis, id)
  return res.goodCtftimeRemoved()
}

export const updateUserAvatar = async (
  db: DatabaseClient,
  redis: TypedRedis,
  id: string,
  avatarUrl: string | null
): Promise<void> => {
  await Promise.all([
    db.update(users).set({ avatarUrl }).where(eq(users.id, id)),
    invalidateUserCache(redis, id),
  ])
}

const preparedGetUser = preparedPerDb(db =>
  db
    .select()
    .from(users)
    .where(eq(users.id, sql.placeholder('id')))
    .limit(1)
    .prepare('rctf_get_user_by_id')
)

export const getUser = async (
  db: DatabaseClient,
  id: string
): Promise<User | undefined> => {
  return await preparedGetUser(db).execute({ id }).then(takeUnique)
}

export const getUserByNameOrEmail = async (
  db: DatabaseClient,
  options: {
    name: string
    email: string | undefined
  }
): Promise<User | undefined> => {
  return await db
    .select()
    .from(users)
    .where(
      or(
        eq(users.name, options.name),
        options.email ? eq(users.email, options.email) : undefined
      )
    )
    .limit(1)
    .then(takeUnique)
}

export const getUserByEmail = async (
  db: DatabaseClient,
  email: string
): Promise<User | undefined> => {
  return await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .then(takeUnique)
}

export const getUserByCtftimeId = async (
  db: DatabaseClient,
  ctftimeId: string
): Promise<User | undefined> => {
  return await db
    .select()
    .from(users)
    .where(eq(users.ctftimeId, ctftimeId))
    .limit(1)
    .then(takeUnique)
}

export type AdminUserInfo = {
  id: string
  name: string
  email: string | null
  division: string
  perms: number
  banned: boolean
  score: number
  solveCount: number
  avatarUrl: string | null
  countryCode: string | null
  statusText: string | null
  createdAt: string
}

export type AdminUserSolveInfo = {
  challengeId: string
  challengeName: string
  challengeCategory: string
  createdAt: string
}

export type AdminUserDetails = AdminUserInfo & {
  solves: AdminUserSolveInfo[]
}

// TODO(es3n1n): move this escape to utils at some point
const escapeLikePattern = (value: string) => value.replace(/[\\%_]/g, '\\$&')

export const userNameSearchFilter = (search: string) => {
  const pattern = `%${escapeLikePattern(search.toLowerCase())}%`
  return sql`(
    lower(${users.name}::text) LIKE ${pattern} ESCAPE ${'\\'}
    OR
    ${users.name} % ${search}
    OR ${search} <% ${users.name}
  )`
}

export const adminUserSearchFilter = (search: string) => {
  const pattern = `%${escapeLikePattern(search.toLowerCase())}%`
  return sql`(
    ${userNameSearchFilter(search)}
    OR (
      ${users.email} IS NOT NULL
      AND lower(${users.email}) LIKE ${pattern} ESCAPE ${'\\'}
    )
  )`
}

export const adminTeamStatusExpression = sql<AdminTeamStatus>`
  CASE
    WHEN ${users.perms} > 0 THEN ${AdminTeamStatus.ADMIN}
    WHEN ${users.banned} THEN ${AdminTeamStatus.BANNED}
    ELSE ${AdminTeamStatus.ACTIVE}
  END
`

type AdminUsersQuery = RouteQuery<typeof GetAdminUsersRouteV2> &
  Partial<RouteBody<typeof FilterAdminUsersRouteV2>>

const buildUsersFilters = (params: AdminUsersQuery): SQL | undefined => {
  const search = params.search?.trim()
  return and(
    search ? adminUserSearchFilter(search) : undefined,
    ...setFilter(adminTeamStatusExpression, params.status),
    ...setFilter(sql`${users.division}`, params.division)
  )
}

const buildUsersOrderBy = (params: AdminUsersQuery): SQL[] => {
  const sortBy = params.sortBy ?? AdminTeamSortBy.CREATED_AT
  const dir = params.sortOrder === SortOrder.DESC ? desc : asc
  const search = params.search?.trim()

  const sortExpr: Partial<Record<AdminTeamSortBy, SQL | PgColumn>> = {
    [AdminTeamSortBy.TEAM]: sql`lower(${users.name}::text)`,
    [AdminTeamSortBy.EMAIL]: sql`lower(coalesce(${users.email}, ''))`,
    [AdminTeamSortBy.DIVISION]: users.division,
    [AdminTeamSortBy.SCORE]: users.score,
    [AdminTeamSortBy.SOLVES]: count(solves.id),
    [AdminTeamSortBy.STATUS]: adminTeamStatusExpression,
    // createdAt is tiebreaker by default
  }

  const tieDir = sortBy === AdminTeamSortBy.CREATED_AT ? dir : asc
  return [
    ...(search ? [sql`similarity(${users.name}, ${search}) DESC`] : []),
    ...(sortExpr[sortBy] ? [dir(sortExpr[sortBy]!)] : []),
    tieDir(users.createdAt),
    tieDir(users.id),
  ]
}

export const getAllUsersWithScores = async (
  db: DatabaseClient,
  params: AdminUsersQuery
): Promise<{ total: number; users: AdminUserInfo[] }> => {
  const filters = buildUsersFilters(params)
  const orderBy = buildUsersOrderBy(params)

  const [countResult, users_] = await Promise.all([
    db.select({ count: count() }).from(users).where(filters),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        division: users.division,
        perms: users.perms,
        banned: users.banned,
        score: users.score,
        avatarUrl: users.avatarUrl,
        countryCode: users.countryCode,
        statusText: users.statusText,
        createdAt: users.createdAt,
        solveCount: count(solves.id),
      })
      .from(users)
      .leftJoin(solves, eq(users.id, solves.userid))
      .where(filters)
      .groupBy(users.id)
      .orderBy(...orderBy)
      .limit(params.limit)
      .offset(params.offset),
  ])

  return { total: countResult[0]?.count ?? 0, users: users_ }
}

export const getAdminUserWithSolves = async (
  db: DatabaseClient,
  id: string
): Promise<AdminUserDetails | undefined> => {
  const user = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      division: users.division,
      perms: users.perms,
      banned: users.banned,
      score: users.score,
      avatarUrl: users.avatarUrl,
      countryCode: users.countryCode,
      statusText: users.statusText,
      createdAt: users.createdAt,
      solveCount: count(solves.id),
    })
    .from(users)
    .leftJoin(solves, eq(users.id, solves.userid))
    .where(eq(users.id, id))
    .groupBy(users.id)
    .limit(1)
    .then(takeUnique)

  if (!user) {
    return undefined
  }

  const userSolves = await db
    .select({
      challengeId: challenges.id,
      challengeName: sql<string>`${challenges.data} ->> 'name'`,
      challengeCategory: sql<string>`${challenges.data} ->> 'category'`,
      createdAt: solves.createdat,
    })
    .from(solves)
    .innerJoin(challenges, eq(challenges.id, solves.challengeid))
    .where(eq(solves.userid, id))
    .orderBy(asc(solves.createdat))

  return {
    ...user,
    solves: userSolves.map(solve => ({
      challengeId: solve.challengeId,
      challengeName: solve.challengeName ?? '',
      challengeCategory: solve.challengeCategory ?? '',
      createdAt: solve.createdAt,
    })),
  }
}

export type AdminUserMutationResult =
  | { success: true }
  | {
      success: false
      error: 'badUnknownUser' | 'badUserPrivileged' | 'badKnownName'
    }

// enqueue recomputes only for decay challenges
const getAffectedDecayChallengeIds = (
  db: DatabaseClient | DatabaseTx,
  userId: string
): Promise<string[]> =>
  db
    .selectDistinct({ challengeid: solves.challengeid })
    .from(solves)
    .innerJoin(challenges, eq(challenges.id, solves.challengeid))
    .where(and(eq(solves.userid, userId), isDecayKind))
    .then(rows => rows.map(r => r.challengeid))

const publishChallengeRecomputes = (
  redis: TypedRedis,
  challengeIds: string[],
  source: RecomputeSource
): void => {
  for (const challengeId of challengeIds) {
    requestChallengeRecompute(redis, challengeId, source)
  }
}

export const updateAdminUser = async (
  db: DatabaseClient,
  redis: TypedRedis,
  id: string,
  data: {
    banned?: boolean
    name?: string
    division?: string
    countryCode?: string | null
    statusText?: string | null
  }
): Promise<AdminUserMutationResult> => {
  const targetUser = await getUser(db, id)
  if (!targetUser) {
    return { success: false, error: 'badUnknownUser' }
  }

  if (targetUser.perms > 0) {
    return { success: false, error: 'badUserPrivileged' }
  }

  const hasProfileUpdate =
    data.name !== undefined ||
    data.division !== undefined ||
    data.countryCode !== undefined ||
    data.statusText !== undefined

  if (hasProfileUpdate) {
    const result = await updateUserInternal(
      db,
      redis,
      targetUser,
      {
        name: data.name ?? targetUser.name,
        division: data.division ?? targetUser.division,
        countryCode:
          data.countryCode !== undefined
            ? data.countryCode
            : targetUser.countryCode,
        statusText:
          data.statusText !== undefined
            ? data.statusText
            : targetUser.statusText,
      },
      { bypassDivisionFreeze: true }
    )
    if (!result.success) {
      return { success: false, error: 'badKnownName' }
    }
  }

  if (data.banned !== undefined) {
    const willBeBanned = data.banned

    const affectedDecayIds = await db.transaction(async tx => {
      const updated = await tx
        .update(users)
        .set({
          banned: willBeBanned,
          ...(willBeBanned
            ? {
                score: 0,
                globalRank: null,
                divisionRank: null,
                lastSolveAt: null,
                lastTiebreakSolveAt: null,
              }
            : {}),
        })
        .where(and(eq(users.id, id), ne(users.banned, willBeBanned)))
        .returning({ id: users.id })

      if (updated.length === 0) {
        return [] as string[]
      }

      await emitBanScoreEvents(tx, id, willBeBanned ? 'ban' : 'unban')
      return await getAffectedDecayChallengeIds(tx, id)
    })

    publishChallengeRecomputes(redis, affectedDecayIds, 'ban')

    await invalidateUserCache(redis, id)
    forceLeaderboardUpdate(redis)
  }

  return { success: true }
}

export const deleteAdminUser = async (
  db: DatabaseClient,
  redis: TypedRedis,
  id: string
): Promise<AdminUserMutationResult> => {
  const targetUser = await getUser(db, id)
  if (!targetUser) {
    return { success: false, error: 'badUnknownUser' }
  }

  if (targetUser.perms > 0) {
    return { success: false, error: 'badUserPrivileged' }
  }

  // collect challengeids before the cascade delete wipes the solves rows
  const affectedDecayIds = await db.transaction(async tx => {
    const target = await tx
      .select({ banned: users.banned })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
      .for('update')
      .then(takeUnique)
    if (!target) {
      return [] as string[]
    }

    // a banned user's score events already net to zero
    if (!target.banned) {
      await emitUserDeletionScoreEvents(tx, id)
    }
    const ids = await getAffectedDecayChallengeIds(tx, id)
    await tx.delete(users).where(eq(users.id, id))
    return ids
  })

  publishChallengeRecomputes(redis, affectedDecayIds, 'delete')

  await invalidateUserCache(redis, id)
  forceLeaderboardUpdate(redis)
  return { success: true }
}
