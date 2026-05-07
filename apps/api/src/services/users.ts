import type { DatabaseClient, User } from '@rctf/db'
import { challenges, solves, users } from '@rctf/db'
import { getErrorConstraint, takeUnique } from '@rctf/db/util'
import type {
  AdminTeamSortBy,
  AdminTeamSortOrder,
  AdminTeamStatus,
  BadEmailNoExists,
  BadUnknownUser,
  BadZeroAuth,
  GoodCtftimeAuthSet,
  GoodCtftimeRemoved,
  GoodEmailRemoved,
  GoodEmailSet,
  ResponseHelpers,
} from '@rctf/types'
import {
  AdminTeamSortBy as AdminTeamSortByValue,
  AdminTeamSortOrder as AdminTeamSortOrderValue,
  AdminTeamStatus as AdminTeamStatusValue,
  BadKnownCtftimeId,
  BadKnownEmail,
  BadKnownName,
  GoodRegister,
  GoodRegisterV2,
} from '@rctf/types'
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  notInArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'
import { invalidateUserCache } from '../cache/auth-cache'
import type { TypedRedis } from '../cache/scripts'
import { createToken, TokenKind } from '../lib/tokens'
import { forceLeaderboardUpdate } from '../workers'

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
  | { success: false; error: 'badKnownName' }

export const updateUserInternal = async (
  db: DatabaseClient,
  redis: TypedRedis,
  id: string,
  user: Pick<User, 'division' | 'name' | 'countryCode' | 'statusText'>
): Promise<UpdateUserResult> => {
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
    if (contraintName === 'users_name_key') {
      return { success: false, error: 'badKnownName' }
    }
    throw error
  }

  await invalidateUserCache(redis, id)
  forceLeaderboardUpdate()
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

export const getUser = async (
  db: DatabaseClient,
  id: string
): Promise<User | undefined> => {
  return await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
    .then(takeUnique)
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

export const userNameSearchFilter = (search: string) =>
  sql`(${users.name} % ${search} OR ${search} <% ${users.name})`

type AdminUsersQuery = {
  limit: number
  offset: number
  search?: string
  sortBy?: AdminTeamSortBy
  sortOrder?: AdminTeamSortOrder
  statuses?: AdminTeamStatus[]
  excludeStatuses?: AdminTeamStatus[]
  divisions?: string[]
  excludeDivisions?: string[]
}

const adminTeamStatusExpression = sql<AdminTeamStatus>`
  CASE
    WHEN ${users.perms} > 0 THEN ${AdminTeamStatusValue.ADMIN}
    WHEN ${users.banned} THEN ${AdminTeamStatusValue.BANNED}
    ELSE ${AdminTeamStatusValue.ACTIVE}
  END
`

const adminUserSearchFilter = (search: string) =>
  sql`(
    ${users.name} % ${search}
    OR ${search} <% ${users.name}
    OR lower(${users.email}) like ${`%${search.toLowerCase()}%`}
  )`

const adminUserFilters = (params: AdminUsersQuery): SQL | undefined => {
  const filters: SQL[] = []

  if (params.search?.trim()) {
    filters.push(adminUserSearchFilter(params.search.trim()))
  }
  if (params.statuses?.length) {
    filters.push(inArray(adminTeamStatusExpression, params.statuses))
  }
  if (params.excludeStatuses?.length) {
    filters.push(notInArray(adminTeamStatusExpression, params.excludeStatuses))
  }
  if (params.divisions?.length) {
    filters.push(inArray(users.division, params.divisions))
  }
  if (params.excludeDivisions?.length) {
    filters.push(notInArray(users.division, params.excludeDivisions))
  }

  return filters.length ? and(...filters) : undefined
}

const adminUserSortOrder = (params: AdminUsersQuery) => {
  const search = params.search?.trim()
  if (search && !params.sortBy) {
    return [
      sql`similarity(${users.name}, ${search}) DESC`,
      asc(users.createdAt),
    ]
  }

  const sortBy = params.sortBy ?? AdminTeamSortByValue.CREATED_AT
  const sortOrder = params.sortOrder ?? AdminTeamSortOrderValue.ASC
  const direction = sortOrder === AdminTeamSortOrderValue.ASC ? asc : desc
  const solveCount = count(solves.id)

  switch (sortBy) {
    case AdminTeamSortByValue.TEAM:
      return [direction(sql`lower(${users.name}::text)`), asc(users.createdAt)]
    case AdminTeamSortByValue.EMAIL:
      return [
        direction(sql`lower(coalesce(${users.email}, ''))`),
        asc(users.createdAt),
      ]
    case AdminTeamSortByValue.DIVISION:
      return [direction(users.division), asc(users.createdAt)]
    case AdminTeamSortByValue.SCORE:
      return [direction(users.score), asc(users.createdAt)]
    case AdminTeamSortByValue.SOLVES:
      return [direction(solveCount), asc(users.createdAt)]
    case AdminTeamSortByValue.STATUS:
      return [direction(adminTeamStatusExpression), asc(users.createdAt)]
    case AdminTeamSortByValue.CREATED_AT:
      return [direction(users.createdAt), direction(users.id)]
  }
}

export const getAllUsersWithScores = async (
  db: DatabaseClient,
  params: AdminUsersQuery
): Promise<{ total: number; users: AdminUserInfo[] }> => {
  const filters = adminUserFilters(params)
  const solveCount = count(solves.id)
  const [countResult, dbUsers] = await Promise.all([
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
        solveCount,
      })
      .from(users)
      .leftJoin(solves, eq(users.id, solves.userid))
      .where(filters)
      .groupBy(users.id)
      .orderBy(...adminUserSortOrder(params))
      .limit(params.limit)
      .offset(params.offset),
  ])

  return {
    total: countResult[0]?.count ?? 0,
    users: dbUsers.map(u => ({
      ...u,
      score: u.score,
    })),
  }
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
  | { success: false; error: 'badUnknownUser' | 'badUserPrivileged' }

export const updateAdminUser = async (
  db: DatabaseClient,
  redis: TypedRedis,
  id: string,
  data: { banned?: boolean }
): Promise<AdminUserMutationResult> => {
  const targetUser = await getUser(db, id)
  if (!targetUser) {
    return { success: false, error: 'badUnknownUser' }
  }

  if (targetUser.perms > 0) {
    return { success: false, error: 'badUserPrivileged' }
  }

  await db
    .update(users)
    .set({
      banned: data.banned ?? targetUser.banned ?? false,
      ...(data.banned
        ? {
            score: 0,
            globalRank: null,
            divisionRank: null,
            lastSolveAt: null,
            lastTiebreakSolveAt: null,
          }
        : {}),
    })
    .where(eq(users.id, id))

  await invalidateUserCache(redis, id)
  forceLeaderboardUpdate()
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

  await db.delete(users).where(eq(users.id, id))
  await invalidateUserCache(redis, id)
  forceLeaderboardUpdate()
  return { success: true }
}
