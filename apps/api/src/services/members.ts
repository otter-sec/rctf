import type { DatabaseClient, DatabaseTx, UserMember } from '@rctf/db'
import { userMembers } from '@rctf/db/schema'
import { getErrorConstraint, takeUnique } from '@rctf/db/util'
import type {
  BadKnownEmail,
  BadTooManyMembers,
  GoodMemberCreate,
  ResponseHelpers,
} from '@rctf/types'
import { and, count, eq, sql } from 'drizzle-orm'

type CreateMemberResponseHelpers = ResponseHelpers<
  [typeof BadKnownEmail, typeof BadTooManyMembers, typeof GoodMemberCreate]
>

const lockUserMembers = (tx: DatabaseTx, userId: string) =>
  tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${'user_members:' + userId}, 0))`
  )

export const createMember = async (
  res: CreateMemberResponseHelpers,
  db: DatabaseClient,
  userId: string,
  email: string,
  maxMembers: number
): Promise<
  ReturnType<CreateMemberResponseHelpers[keyof CreateMemberResponseHelpers]>
> => {
  let member: UserMember | undefined
  let limitReached = false
  try {
    member = await db.transaction(async tx => {
      await lockUserMembers(tx, userId)

      const result = await tx
        .select({ memberCount: count() })
        .from(userMembers)
        .where(eq(userMembers.userid, userId))
        .then(takeUnique)

      if (result && result.memberCount >= maxMembers) {
        limitReached = true
        return undefined
      }

      return await tx
        .insert(userMembers)
        .values({ id: crypto.randomUUID(), userid: userId, email })
        .returning()
        .then(takeUnique)
    })
  } catch (error) {
    const constraintName = getErrorConstraint(error)
    if (constraintName === 'user_members_userid_email_key') {
      return res.badKnownEmail()
    }
    throw error
  }

  if (limitReached) {
    return res.badTooManyMembers()
  }
  return res.goodMemberCreate(member!)
}

export const getMembers = async (
  db: DatabaseClient,
  userId: string
): Promise<UserMember[]> => {
  return await db
    .select()
    .from(userMembers)
    .where(eq(userMembers.userid, userId))
}

export const deleteMember = async (
  db: DatabaseClient,
  id: string,
  userId: string
): Promise<void> => {
  await db
    .delete(userMembers)
    .where(and(eq(userMembers.id, id), eq(userMembers.userid, userId)))
}
