import type {
  Challenge,
  ChallengeData,
  DatabaseClient,
  InstancerConfig,
  Solve,
} from '@rctf/db'
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
import { and, asc, desc, eq, inArray, lte, or, sql } from 'drizzle-orm'
import type { PinoLogger } from 'hono-pino'
import { getUsersScores } from '../cache/leaderboard'
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

type LeaderboardSolve = { challengeId: string; solveTime: number }
type SolvesAvatars = {
  solves: Map<string, LeaderboardSolve[]>
  avatars: Map<string, string | null>
}

type ChallengeSolvesWithPosition = {
  challengeExists: boolean
  solves: {
    id: string
    createdAt: string
    userId: string
    userName: string
    userAvatarUrl: string | null
    globalPlace: number
    division: string
    divisionPlace: number
  }[]
  solvePosition: number | null
}

const createRankedSolves = (db: DatabaseClient) =>
  db.$with('ranked').as(
    db
      .select({
        solveId: solves.id,
        challengeId: solves.challengeid,
        userId: solves.userid,
        userName: users.name,
        userAvatarUrl: users.avatarUrl,
        userDivision: users.division,
        createdAt: solves.createdat,
        position:
          sql<number>`row_number() over (partition by ${solves.challengeid} order by ${solves.createdat})::int`.as(
            'position'
          ),
      })
      .from(solves)
      .innerJoin(users, eq(users.id, solves.userid))
  )

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

const defaultChallengeData: ChallengeData = {
  name: '',
  description: '',
  category: '',
  author: '',
  files: [],
  points: { min: 0, max: 0 },
  flag: '',
  tiebreakEligible: true,
}

const defaultInstancerConfig: InstancerConfig = {
  challengeIntegrationId: '',
  config: {},
  expose: [],
  timeoutMilliseconds: 0,
}

export const upsertChallenge = async (
  db: DatabaseClient,
  id: string,
  partial: Partial<
    Omit<ChallengeData, 'instancerConfig'> & {
      instancerConfig?: Partial<InstancerConfig> | null
    }
  >
): Promise<Challenge> => {
  const current = await getChallenge(db, id)
  const { instancerConfig: partialInstancerConfig, ...partialRest } = partial

  // Handle instancerConfig: null = clear, undefined = keep current, object = merge
  let instancerConfig: InstancerConfig | undefined
  if (partialInstancerConfig === null) {
    instancerConfig = undefined // Explicitly cleared
  } else if (partialInstancerConfig !== undefined) {
    instancerConfig = {
      ...defaultInstancerConfig,
      ...current?.data.instancerConfig,
      ...partialInstancerConfig,
    }
  } else {
    instancerConfig = current?.data.instancerConfig
  }

  // Filter out undefined values, otherwise we will include them
  const filteredPartial = Object.fromEntries(
    Object.entries(partialRest).filter(([_, v]) => v !== undefined)
  )

  const data: ChallengeData = {
    ...defaultChallengeData,
    ...current?.data,
    ...filteredPartial,
    instancerConfig,
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
  await db.transaction(async tx => {
    await tx.delete(solves).where(eq(solves.challengeid, id))
    await tx.delete(challenges).where(eq(challenges.id, id))
  })
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

export const getChallengeSolvesWithPosition = async (
  db: DatabaseClient,
  redis: TypedRedis,
  challengeId: string,
  userId: string,
  limit: number,
  offset: number
): Promise<ChallengeSolvesWithPosition> => {
  const ranked = createRankedSolves(db)
  const rows = await db
    .with(ranked)
    .select({
      solveId: ranked.solveId,
      createdAt: ranked.createdAt,
      userId: ranked.userId,
      userName: ranked.userName,
      userAvatarUrl: ranked.userAvatarUrl,
      userDivision: ranked.userDivision,
      userSolvePosition: sql<number | null>`(
        SELECT position FROM ranked WHERE challengeid = ${challengeId} AND userid = ${userId}
      )`.as('user_solve_position'),
    })
    .from(ranked)
    .where(eq(ranked.challengeId, challengeId))
    .orderBy(asc(ranked.position))
    .limit(limit)
    .offset(offset)

  if (rows.length === 0) {
    const challengeExists = await getChallenge(db, challengeId)
    return {
      challengeExists: !!challengeExists,
      solvePosition: null,
      solves: [],
    }
  }

  const userScores = await getUsersScores(
    redis,
    rows.map(r => r.userId)
  )
  return {
    challengeExists: true,
    solvePosition: rows[0]!.userSolvePosition,
    solves: rows.map(r => {
      const scores = userScores.get(r.userId)
      return {
        id: r.solveId,
        createdAt: r.createdAt,
        userId: r.userId,
        userName: r.userName,
        userAvatarUrl: r.userAvatarUrl,
        globalPlace: scores?.place ?? 0,
        division: r.userDivision,
        divisionPlace: scores?.divisionPlace ?? 0,
      }
    }),
  }
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

export const getSolvesAndAvatars = async (
  db: DatabaseClient,
  userIds: string[]
): Promise<SolvesAvatars> => {
  if (userIds.length === 0) {
    return {
      solves: new Map(),
      avatars: new Map(),
    }
  }

  const rows = await db
    .select({
      challenge_id: solves.challengeid,
      user_id: solves.userid,
      avatar_url: users.avatarUrl,
      created_at: solves.createdat,
    })
    .from(solves)
    .innerJoin(users, eq(users.id, solves.userid))
    .where(inArray(solves.userid, userIds))
    .orderBy(asc(solves.createdat))

  const solvesMap = new Map<string, LeaderboardSolve[]>(
    userIds.map(id => [id, []])
  )
  const avatars = new Map<string, string | null>()

  for (const row of rows) {
    avatars.set(row.user_id, avatars.get(row.user_id) ?? row.avatar_url)
    solvesMap.get(row.user_id)?.push({
      challengeId: row.challenge_id,
      solveTime: new Date(row.created_at).getTime(),
    })
  }

  return { solves: solvesMap, avatars }
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

  // burst 5, then 1 per 5s
  const timeLeft = await rateLimit(
    redis,
    `rl:FLAG:${params.challengeId}:${params.userId}`,
    5,
    25_000
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

export const deleteSolve = async (
  db: DatabaseClient,
  params: {
    challengeId: string
    userId: string
  }
): Promise<Solve[]> => {
  return db
    .delete(solves)
    .where(
      and(
        eq(solves.userid, params.userId),
        eq(solves.challengeid, params.challengeId)
      )
    )
    .returning()
}
