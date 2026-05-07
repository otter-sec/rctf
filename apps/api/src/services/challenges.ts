import type {
  AdminBotConfig,
  Challenge,
  ChallengeData,
  DatabaseClient,
  InstancerConfig,
  Solve,
} from '@rctf/db'
import { challenges, solves, submissions, users } from '@rctf/db'
import { getErrorConstraint, takeUnique } from '@rctf/db/util'
import type {
  BadAlreadySolvedChallenge,
  BadChallenge,
  BadFlag,
  BadPerms,
  BadRateLimit,
  BadUnknownUser,
  GoodFlag,
  ResponseHelpers,
} from '@rctf/types'
import { SubmissionKind, SubmissionResult } from '@rctf/types'
import { and, asc, desc, eq, inArray, lte, or, sql } from 'drizzle-orm'
import type { PinoLogger } from 'hono-pino'
import type { TypedRedis } from '../cache/scripts'
import { verifyDefaultFlag } from '../providers/flags'
import { forceLeaderboardUpdate } from '../workers'
import { sendBloodMessage, shouldNotifyBloodbot } from './bloodbot'
import { rateLimitFlag } from './rate-limit'
import { createSubmission } from './submissions'
import { getUser } from './users'

type SubmitResponseHelpers = ResponseHelpers<
  [
    typeof BadChallenge,
    typeof BadRateLimit,
    typeof BadFlag,
    typeof BadPerms,
    typeof GoodFlag,
    typeof BadAlreadySolvedChallenge,
    typeof BadUnknownUser,
  ]
>

const getSubmitterState = async (
  db: DatabaseClient,
  userId: string
): Promise<{ banned: boolean } | undefined> => {
  return await db
    .select({
      banned: users.banned,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then(takeUnique)
}

type LeaderboardSolve = { challengeId: string; solveTime: number }
type UserDisplayInfo = {
  avatarUrl: string | null
  countryCode: string | null
  statusText: string | null
}
type SolvesAndUserInfo = {
  solves: Map<string, LeaderboardSolve[]>
  userInfo: Map<string, UserDisplayInfo>
}

type ChallengeSolvesWithPosition = {
  challengeExists: boolean
  solves: {
    id: string
    createdAt: string
    userId: string
    userName: string
    userAvatarUrl: string | null
    userCountryCode: string | null
    userStatusText: string | null
    globalPlace: number
    division: string
    divisionPlace: number
    bloodIndex: number | null
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
        userCountryCode: users.countryCode,
        userStatusText: users.statusText,
        userDivision: users.division,
        createdAt: solves.createdat,
        position:
          sql<number>`row_number() over (partition by ${solves.challengeid} order by ${solves.createdat})::int`.as(
            'position'
          ),
      })
      .from(solves)
      .innerJoin(users, eq(users.id, solves.userid))
      .where(eq(users.banned, false))
  )

export const getPrivateChallenges = async (
  db: DatabaseClient
): Promise<Challenge[]> => {
  return await db
    .select({
      id: challenges.id,
      data: challenges.data,
      score: challenges.score,
      solveCount: challenges.solveCount,
    })
    .from(challenges)
    .orderBy(...challengeDefaultOrder)
}

export const getPrivateChallenge = async (
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

export const isChallengePublic = (challenge: Challenge): boolean => {
  // Hidden takes priority over releaseTime
  if (challenge.data.hidden) {
    return false
  }
  return +new Date() >= (challenge.data.releaseTime ?? 0)
}

export const challengeIsPublicSql = and(
  sql`COALESCE((${challenges.data} ->> 'hidden')::boolean, false) = false`,
  sql`COALESCE((${challenges.data} ->> 'releaseTime')::bigint, 0) <= ${sql.raw('extract(epoch from now())::bigint * 1000')}`
)!

const challengeDefaultOrder = [
  sql`((${challenges.data} ->> 'sortWeight')::int) NULLS LAST`,
  desc(challenges.id),
] as const

export const getChallenges = async (
  db: DatabaseClient
): Promise<Challenge[]> => {
  return await db
    .select({
      id: challenges.id,
      data: challenges.data,
      score: challenges.score,
      solveCount: challenges.solveCount,
    })
    .from(challenges)
    .where(challengeIsPublicSql)
    .orderBy(...challengeDefaultOrder)
}

export const getChallenge = async (
  db: DatabaseClient,
  id: string
): Promise<Challenge | undefined> => {
  return await db
    .select()
    .from(challenges)
    .where(and(eq(challenges.id, id), challengeIsPublicSql))
    .limit(1)
    .then(takeUnique)
}

export const createSolveAndGetBloodNumber = async (
  db: DatabaseClient,
  params: {
    challengeId: string
    userId: string
    submissionIp?: string | null
    submittedFlag?: string
  }
): Promise<number> => {
  const solveId = crypto.randomUUID()
  const submissionId = crypto.randomUUID()

  return await db.transaction(async tx => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${params.challengeId}))`
    )

    const result = await tx
      .execute<{ solve_count: number }>(
        sql`
        SELECT COUNT(*)::int AS solve_count
        FROM solves
        INNER JOIN "users" ON "users".id = solves.userid
        WHERE solves.challengeid = ${params.challengeId}
          AND "users".banned = false
      `
      )
      .then(takeUnique)

    await tx.execute(sql`
      INSERT INTO solves (id, challengeid, userid, createdat, submissionip)
      VALUES (${solveId}, ${params.challengeId}, ${params.userId}, NOW(), ${params.submissionIp ?? null})
    `)

    await tx.insert(submissions).values({
      id: submissionId,
      kind: SubmissionKind.FLAG,
      challengeId: params.challengeId,
      userId: params.userId,
      ip: params.submissionIp ?? 'unknown',
      result: SubmissionResult.CORRECT,
      details: params.submittedFlag
        ? { submittedFlag: params.submittedFlag }
        : {},
      relatedId: solveId,
      createdAt: new Date().toISOString(),
    })

    return result!.solve_count + 1
  })
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
  hidden: false,
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
    Omit<ChallengeData, 'instancerConfig' | 'adminBotConfig'> & {
      instancerConfig?: Partial<InstancerConfig> | null
      adminBotConfig?: AdminBotConfig | null
    }
  >
): Promise<Challenge> => {
  const current = await getPrivateChallenge(db, id)
  const {
    instancerConfig: partialInstancerConfig,
    adminBotConfig: partialAdminBotConfig,
    ...partialRest
  } = partial

  // null = clear, undefined = keep current, object = merge
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

  // null = clear, undefined = keep current, object = replace
  let adminBotConfig: AdminBotConfig | undefined
  if (partialAdminBotConfig === null) {
    adminBotConfig = undefined
  } else if (partialAdminBotConfig !== undefined) {
    adminBotConfig = partialAdminBotConfig
  } else {
    adminBotConfig = current?.data.adminBotConfig
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
    adminBotConfig,
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
    .where(and(eq(solves.challengeid, challengeId), eq(users.banned, false)))
    .orderBy(asc(solves.createdat))
    .limit(limit)
    .offset(offset)
}

export const getChallengeSolvesWithPosition = async (
  db: DatabaseClient,
  challengeId: string,
  userId: string | null,
  limit: number,
  offset: number
): Promise<ChallengeSolvesWithPosition> => {
  const challenge = await getChallenge(db, challengeId)
  if (!challenge) {
    return {
      challengeExists: false,
      solvePosition: null,
      solves: [],
    }
  }

  const ranked = createRankedSolves(db)
  const rows = await db
    .with(ranked)
    .select({
      solveId: ranked.solveId,
      createdAt: ranked.createdAt,
      userId: ranked.userId,
      userName: ranked.userName,
      userAvatarUrl: ranked.userAvatarUrl,
      userCountryCode: ranked.userCountryCode,
      userStatusText: ranked.userStatusText,
      userDivision: ranked.userDivision,
      userGlobalRank: users.globalRank,
      userDivisionRank: users.divisionRank,
      position: ranked.position,
      userSolvePosition: sql<number | null>`(
        SELECT position FROM ranked WHERE challengeid = ${challengeId} AND userid = ${userId}
      )`.as('user_solve_position'),
    })
    .from(ranked)
    .innerJoin(users, eq(users.id, ranked.userId))
    .where(eq(ranked.challengeId, challengeId))
    .orderBy(asc(ranked.position))
    .limit(limit)
    .offset(offset)

  if (rows.length === 0) {
    return {
      challengeExists: true,
      solvePosition: null,
      solves: [],
    }
  }

  return {
    challengeExists: true,
    solvePosition: rows[0]!.userSolvePosition,
    solves: rows.map(r => ({
      id: r.solveId,
      createdAt: r.createdAt,
      userId: r.userId,
      userName: r.userName,
      userAvatarUrl: r.userAvatarUrl,
      userCountryCode: r.userCountryCode,
      userStatusText: r.userStatusText,
      globalPlace: r.userGlobalRank ?? 0,
      division: r.userDivision,
      divisionPlace: r.userDivisionRank ?? 0,
      bloodIndex: r.position <= 3 ? r.position - 1 : null,
    })),
  }
}

export const getUserChallengeSolves = async (
  db: DatabaseClient,
  userId: string
): Promise<
  { solve: Solve; challengeData: ChallengeData; bloodIndex: number | null }[]
> => {
  const ranked = createRankedSolves(db)
  const rows = await db
    .with(ranked)
    .select({
      solve: solves,
      challengeData: challenges.data,
      position: ranked.position,
    })
    .from(ranked)
    .innerJoin(solves, eq(solves.id, ranked.solveId))
    .innerJoin(
      challenges,
      and(eq(challenges.id, solves.challengeid), challengeIsPublicSql)
    )
    .where(eq(ranked.userId, userId))
    .orderBy(asc(solves.createdat))

  return rows.map(row => ({
    solve: row.solve,
    challengeData: row.challengeData,
    bloodIndex: row.position <= 3 ? row.position - 1 : null,
  }))
}

export const getSolvesAndUserInfo = async (
  db: DatabaseClient,
  userIds: string[]
): Promise<SolvesAndUserInfo> => {
  if (userIds.length === 0) {
    return {
      solves: new Map(),
      userInfo: new Map(),
    }
  }

  const rows = await db
    .select({
      challenge_id: solves.challengeid,
      user_id: solves.userid,
      avatar_url: users.avatarUrl,
      country_code: users.countryCode,
      status_text: users.statusText,
      created_at: solves.createdat,
    })
    .from(solves)
    .innerJoin(users, eq(users.id, solves.userid))
    .innerJoin(challenges, eq(challenges.id, solves.challengeid))
    .where(
      and(
        inArray(solves.userid, userIds),
        challengeIsPublicSql,
        eq(users.banned, false)
      )
    )
    .orderBy(asc(solves.createdat))

  const solvesMap = new Map<string, LeaderboardSolve[]>(
    userIds.map(id => [id, []])
  )
  const userInfo = new Map<string, UserDisplayInfo>()

  for (const row of rows) {
    if (!userInfo.has(row.user_id)) {
      userInfo.set(row.user_id, {
        avatarUrl: row.avatar_url,
        countryCode: row.country_code,
        statusText: row.status_text,
      })
    }
    solvesMap.get(row.user_id)?.push({
      challengeId: row.challenge_id,
      solveTime: new Date(row.created_at).getTime(),
    })
  }

  return { solves: solvesMap, userInfo }
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
    submissionIp: string | undefined
  }
): Promise<ReturnType<SubmitResponseHelpers[keyof SubmitResponseHelpers]>> => {
  // NOTE(es3n1n): Directly querying from the database to bypass any stale cache entries
  const submitter = await getSubmitterState(db, params.userId)
  if (!submitter) {
    return res.badUnknownUser()
  }

  if (submitter.banned) {
    return res.badPerms()
  }

  const challenge = await getChallenge(db, params.challengeId)
  if (!challenge || !challenge.data.flag) {
    return res.badChallenge()
  }

  const timeLeft = await rateLimitFlag(redis, params.userId, params.challengeId)
  if (timeLeft !== undefined) {
    log.info(
      {
        user: params.userId,
        chall: challenge.id,
        timeLeft,
      },
      'flag submission rate limit exceeded'
    )
    return res.badRateLimit({ timeLeft })
  }

  if (!verifyDefaultFlag(params.flag, challenge.data.flag)) {
    await createSubmission(db, {
      kind: SubmissionKind.FLAG,
      challengeId: params.challengeId,
      userId: params.userId,
      ip: params.submissionIp,
      result: SubmissionResult.INCORRECT,
      details: { submittedFlag: params.flag },
    })
    return res.badFlag()
  }

  log.info(
    {
      user: params.userId,
      chall: challenge.id,
      flag: params.flag,
    },
    'successfull flag submission'
  )

  let bloodNumber: number
  try {
    bloodNumber = await createSolveAndGetBloodNumber(db, {
      challengeId: params.challengeId,
      userId: params.userId,
      submissionIp: params.submissionIp,
      submittedFlag: params.flag,
    })
  } catch (error) {
    const constraintName = getErrorConstraint(error)
    if (constraintName === 'uq') {
      await createSubmission(db, {
        kind: SubmissionKind.FLAG,
        challengeId: params.challengeId,
        userId: params.userId,
        ip: params.submissionIp,
        result: SubmissionResult.ALREADY_SOLVED,
        details: { submittedFlag: params.flag },
      })
      return res.badAlreadySolvedChallenge()
    }
    if (constraintName === 'uuid_fkey') {
      return res.badUnknownUser()
    }
    throw error
  }

  if (shouldNotifyBloodbot(bloodNumber)) {
    getUser(db, params.userId)
      .then(user => {
        return sendBloodMessage(user!, challenge.data, bloodNumber)
      })
      .catch(err => {
        log.error(
          { err, challengeId: params.challengeId, userId: params.userId },
          'bloodbot notification failed'
        )
      })
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
