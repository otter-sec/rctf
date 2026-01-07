import type { DatabaseClient, User } from '@rctf/db'
import { solves, users } from '@rctf/db'
import { getErrorConstraint, takeUnique } from '@rctf/db/util'
import { count, eq, or } from 'drizzle-orm'
import { getFullLeaderboard } from '../cache/leaderboard'
import type { TypedRedis } from '../cache/scripts'
import type {
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
  BadKnownCtftimeId,
  BadKnownEmail,
  BadKnownName,
  GoodRegister,
} from '@rctf/types'
import { invalidateUserCache } from '../cache/auth-cache'
import { createToken, TokenKind } from '../lib/tokens'

type CreateUserResponseHelpers = ResponseHelpers<
  [
    typeof BadKnownCtftimeId,
    typeof BadKnownEmail,
    typeof BadKnownName,
    typeof GoodRegister,
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

export const createUser = async (
  res: CreateUserResponseHelpers,
  db: DatabaseClient,
  user: Pick<User, 'division' | 'email' | 'name' | 'ctftimeId'>
): Promise<
  ReturnType<CreateUserResponseHelpers[keyof CreateUserResponseHelpers]>
> => {
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
      return res.badKnownCtftimeId()
    }
    if (contraintName === 'users_email_key') {
      return res.badKnownEmail()
    }
    if (contraintName === 'users_name_key') {
      return res.badKnownName()
    }
    throw error
  }

  const authToken = await createToken(TokenKind.Auth, created.id)
  return res.goodRegister({ authToken })
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
  score: number
  solveCount: number
  avatarUrl: string | null
  countryCode: string | null
  statusText: string | null
  createdAt: string
}

export const getAllUsersWithScores = async (
  db: DatabaseClient,
  redis: TypedRedis,
  limit: number,
  offset: number
): Promise<{ total: number; users: AdminUserInfo[] }> => {
  const [{ leaderboard }, countResult, dbUsers] = await Promise.all([
    getFullLeaderboard(redis),
    db.select({ count: count() }).from(users),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        division: users.division,
        perms: users.perms,
        avatarUrl: users.avatarUrl,
        countryCode: users.countryCode,
        statusText: users.statusText,
        createdAt: users.createdAt,
        solveCount: count(solves.id),
      })
      .from(users)
      .leftJoin(solves, eq(users.id, solves.userid))
      .groupBy(users.id),
  ])

  const userScores = new Map(leaderboard.map(e => [e.id, e.score]))

  const sortedUsers = dbUsers
    .map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      division: u.division,
      perms: u.perms,
      score: userScores.get(u.id) ?? 0,
      solveCount: u.solveCount,
      avatarUrl: u.avatarUrl,
      countryCode: u.countryCode,
      statusText: u.statusText,
      createdAt: u.createdAt,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (b.solveCount !== a.solveCount) return b.solveCount - a.solveCount
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    .slice(offset, offset + limit)

  return {
    total: countResult[0]?.count ?? 0,
    users: sortedUsers,
  }
}
