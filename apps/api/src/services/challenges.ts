import type { Challenge, ChallengeData, DatabaseClient, Solve } from '@rctf/db'
import { challenges, solves, users } from '@rctf/db'
import { getErrorConstraint, takeUnique } from '@rctf/db/util'
import type {
  BadAlreadySolvedChallenge,
  BadChallenge,
  BadFlag,
  BadRateLimit,
  BadUnknownUser,
  GoodFlag,
  ResponseHelpers,
} from '@rctf/types'
import { asc, desc, eq, sql } from 'drizzle-orm'
import type { PinoLogger } from 'hono-pino'
import type { TypedRedis } from '../cache/scripts'
import { verifyDefaultFlag } from '../providers/flags'
import { forceLeaderboardUpdate } from '../workers'
import { rateLimit } from './rate-limit'

type SubmitResponseHelpers = ResponseHelpers<
  [
    typeof BadChallenge,
    typeof BadRateLimit,
    typeof BadFlag,
    typeof GoodFlag,
    typeof BadAlreadySolvedChallenge,
    typeof BadUnknownUser,
  ]
>

export const getChallenges = async (
  db: DatabaseClient
): Promise<Challenge[]> => {
  return await db
    .select({
      id: challenges.id,
      data: challenges.data,
    })
    .from(challenges)
    .orderBy(
      sql`((${challenges.data} ->> 'sortWeight')::int) NULLS LAST`,
      desc(challenges.id)
    )
}

export const getChallenge = async (
  db: DatabaseClient,
  id: string
): Promise<Challenge | undefined> => {
  return await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, id))
    .limit(1)
    .then(takeUnique)
}

export const upsertChallenge = async (
  db: DatabaseClient,
  id: string,
  partial: Partial<ChallengeData>
): Promise<Challenge> => {
  const current = await getChallenge(db, id)

  // FIXME(es3n1n): there's gotta be a better way to do this
  const data: ChallengeData = {
    name: partial.name ?? current?.data.name ?? '',
    description: partial.description ?? current?.data.description ?? '',
    category: partial.category ?? current?.data.category ?? '',
    author: partial.author ?? current?.data.author ?? '',
    files: partial.files ?? current?.data.files ?? [],
    points: partial.points ?? current?.data.points ?? { min: 0, max: 0 },
    flag: partial.flag ?? current?.data.flag ?? '',
    tiebreakEligible:
      partial.tiebreakEligible ?? current?.data.tiebreakEligible ?? true,
    sortWeight: partial.sortWeight ?? current?.data.sortWeight ?? undefined,
  }

  const challenge: Challenge = {
    id,
    data,
  }

  if (current) {
    await db.update(challenges).set(challenge).where(eq(challenges.id, id))
  } else {
    await db.insert(challenges).values(challenge)
  }

  return challenge
}

export const deleteChallenge = async (
  db: DatabaseClient,
  id: string
): Promise<void> => {
  await db.delete(challenges).where(eq(challenges.id, id))
  await db.delete(solves).where(eq(solves.challengeid, id))
}

export const getChallengeSolves = async (
  db: DatabaseClient,
  challengeId: string,
  limit: number,
  offset: number
): Promise<
  { solve: Solve; userName: string; userAvatarUrl: string | null }[]
> => {
  return await db
    .select({
      solve: solves,
      userName: users.name,
      userAvatarUrl: users.avatarUrl,
    })
    .from(solves)
    .innerJoin(users, eq(users.id, solves.userid))
    .where(eq(solves.challengeid, challengeId))
    .orderBy(asc(solves.createdat))
    .limit(limit)
    .offset(offset)
}

export const getUserChallengeSolves = async (
  db: DatabaseClient,
  userId: string
): Promise<{ solve: Solve; challengeData: ChallengeData }[]> => {
  return await db
    .select({
      solve: solves,
      challengeData: challenges.data,
    })
    .from(solves)
    .innerJoin(challenges, eq(challenges.id, solves.challengeid))
    .where(eq(solves.userid, userId))
    .orderBy(asc(solves.createdat))
}

export const submitFlag = async (
  res: SubmitResponseHelpers,
  db: DatabaseClient,
  redis: TypedRedis,
  log: PinoLogger,
  params: {
    userId: string
    challengeId: string
    flag: string
  }
): Promise<ReturnType<SubmitResponseHelpers[keyof SubmitResponseHelpers]>> => {
  const challenge = await getChallenge(db, params.challengeId)
  if (!challenge) {
    return res.badChallenge()
  }

  log.info(
    {
      user: params.userId,
      chall: challenge.id,
      flag: params.flag,
    },
    'flag submission attempt'
  )

  // 3 per 10s per user+challenge
  const timeLeft = await rateLimit(
    redis,
    `rl:FLAG:${params.challengeId}:${params.userId}`,
    3,
    10_000
  )
  if (timeLeft !== undefined) {
    log.info(
      {
        user: params.userId,
        chall: challenge.id,
        flag: params.flag,
        timeLeft,
      },
      'flag submission rate limit exceeded'
    )
    return res.badRateLimit({ timeLeft })
  }

  if (!verifyDefaultFlag(params.flag, challenge.data.flag)) {
    return res.badFlag()
  }

  try {
    await db.insert(solves).values({
      id: crypto.randomUUID(),
      challengeid: params.challengeId,
      userid: params.userId,
      createdat: new Date().toISOString(),
    })
  } catch (error) {
    const constraintName = getErrorConstraint(error)
    if (constraintName === 'uq') {
      return res.badAlreadySolvedChallenge()
    }
    if (constraintName === 'uuid_fkey') {
      return res.badUnknownUser()
    }
    throw error
  }

  forceLeaderboardUpdate()
  return res.goodFlag()
}
