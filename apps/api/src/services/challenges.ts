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
import { asc, desc, eq, inArray, lte, or, sql } from 'drizzle-orm'
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

type LeaderboardSolve = { challengeId: string; solveTime: number }
type SolvesAvatarsBloods = {
  solves: Map<string, LeaderboardSolve[]>
  avatars: Map<string, string | null>
  firstSolvers: Map<string, string[]>
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

const createRankedSolves = (db: DatabaseClient, challengeId?: string) => {
  // TODO(es3n1n): maybe dont set these up if we dont need them?
  const position = challengeId
    ? sql<number>`row_number() over (order by ${solves.createdat})::int`
    : sql<number>`row_number() over (partition by ${solves.challengeid} order by ${solves.createdat})::int`

  const divisionPosition = challengeId
    ? sql<number>`row_number() over (partition by ${users.division} order by ${solves.createdat})::int`
    : sql<number>`row_number() over (partition by ${solves.challengeid}, ${users.division} order by ${solves.createdat})::int`

  const baseQuery = db
    .select({
      solveId: solves.id,
      challengeId: solves.challengeid,
      userId: solves.userid,
      userName: users.name,
      userAvatarUrl: users.avatarUrl,
      userDivision: users.division,
      createdAt: solves.createdat,
      position: position.as('position'),
      divisionPosition: divisionPosition.as('division_position'),
    })
    .from(solves)
    .innerJoin(users, eq(users.id, solves.userid))

  const query = challengeId
    ? baseQuery.where(eq(solves.challengeid, challengeId))
    : baseQuery

  return db.$with('ranked').as(query)
}

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
  pods: [],
  expose: [],
  timeoutMilliseconds: 0,
}

export const upsertChallenge = async (
  db: DatabaseClient,
  id: string,
  partial: Partial<
    Omit<ChallengeData, 'instancerConfig'> & {
      instancerConfig?: Partial<InstancerConfig>
    }
  >
): Promise<Challenge> => {
  const current = await getChallenge(db, id)
  const { instancerConfig: partialInstancerConfig, ...partialRest } = partial

  const data: ChallengeData = {
    ...defaultChallengeData,
    ...current?.data,
    ...partialRest,
    instancerConfig: partialInstancerConfig
      ? {
          ...defaultInstancerConfig,
          ...current?.data.instancerConfig,
          ...partialInstancerConfig,
        }
      : current?.data.instancerConfig,
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

export const getChallengeSolvesWithPosition = async (
  db: DatabaseClient,
  challengeId: string,
  userId: string,
  limit: number,
  offset: number
): Promise<ChallengeSolvesWithPosition> => {
  const ranked = createRankedSolves(db, challengeId)
  const rows = await db
    .with(ranked)
    .select({
      solveId: ranked.solveId,
      createdAt: ranked.createdAt,
      userId: ranked.userId,
      userName: ranked.userName,
      userAvatarUrl: ranked.userAvatarUrl,
      userDivision: ranked.userDivision,
      position: ranked.position,
      divisionPosition: ranked.divisionPosition,
      challengeExists:
        sql<boolean>`(SELECT EXISTS(SELECT 1 FROM ${challenges} WHERE id = ${challengeId}))`.as(
          'challenge_exists'
        ),
      userPosition: sql<
        number | null
      >`(SELECT position FROM ranked WHERE userid = ${userId})`.as(
        'user_position'
      ),
    })
    .from(ranked)
    .orderBy(asc(ranked.position))
    .limit(limit)
    .offset(offset)

  const firstRow = rows[0]
  if (firstRow) {
    return {
      challengeExists: firstRow.challengeExists,
      solvePosition: firstRow.userPosition,
      solves: rows.map(r => ({
        id: r.solveId,
        createdAt: r.createdAt,
        userId: r.userId,
        userName: r.userName,
        userAvatarUrl: r.userAvatarUrl,
        globalPlace: r.position,
        division: r.userDivision,
        divisionPlace: r.divisionPosition,
      })),
    }
  }

  const challengeExists = await db
    .select({ id: challenges.id })
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1)
    .then(rows => rows.length > 0)

  return {
    challengeExists,
    solvePosition: null,
    solves: [],
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

export const getSolvesAvatarsBloods = async (
  db: DatabaseClient,
  userIds: string[]
): Promise<SolvesAvatarsBloods> => {
  const numberOfBloods = 3
  const userIdSet = new Set(userIds)

  const ranked = createRankedSolves(db)
  const rows = await db
    .with(ranked)
    .select()
    .from(ranked)
    // always fetch first `numberOfBloods` solvers for each challenge
    .where(
      or(inArray(ranked.userId, userIds), lte(ranked.position, numberOfBloods))
    )
    .orderBy(asc(ranked.position))

  const solvesMap = new Map<string, LeaderboardSolve[]>(
    userIds.map(id => [id, []])
  )
  const avatars = new Map<string, string | null>()
  const firstSolvers = new Map<string, string[]>()

  for (const row of rows) {
    const userId = row.userId
    const challId = row.challengeId
    const position = row.position

    // always save user info we requested
    if (userIdSet.has(userId)) {
      avatars.set(userId, avatars.get(userId) ?? row.userAvatarUrl)
      solvesMap.get(userId)!.push({
        challengeId: challId,
        solveTime: new Date(row.createdAt).getTime(),
      })
    }

    if (position > numberOfBloods) {
      continue
    }

    const bloods = firstSolvers.get(challId) ?? []
    bloods.push(userId)
    firstSolvers.set(challId, bloods)
  }

  return { solves: solvesMap, avatars, firstSolvers }
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
