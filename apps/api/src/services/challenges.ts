import type {
  AdminBotConfig,
  Challenge,
  ChallengeData,
  DatabaseClient,
  DatabaseTx,
  InstancerConfig,
  Solve,
} from '@rctf/db'
import { challenges, scoreEvents, solves, submissions, users } from '@rctf/db'
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
import {
  ChallengeScoringKind,
  SubmissionKind,
  SubmissionResult,
} from '@rctf/types'
import { and, asc, count, desc, eq, inArray, max, sql, sum } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'
import type { PinoLogger } from 'hono-pino'
import type { TypedRedis } from '../cache/scripts'
import { inJsonbArrayPlaceholder } from '../lib/db-bulk'
import { preparedPerDb } from '../lib/prepared'
import { config } from '@rctf/config'
import { verifyDefaultFlag, verifyDynamicFlag } from '../providers/flags'
import { DynamicFlagResult } from '../providers/flags/result'
import { forceLeaderboardUpdate, requestChallengeRecompute } from '../workers'
import { sendBloodMessage, shouldNotifyBloodbot } from './bloodbot'
import { rateLimitFlag } from './rate-limit'
import { getCompetitionTiming } from './settings'
import { createSubmission } from './submissions'
import { getUser } from './users'

const MAX_GRAPH_POINTS_PER_USER = 500

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

export type LeaderboardSolve = {
  challengeId: string
  solveTime: number
}
export type LeaderboardDynamicScore = {
  id: string
  points: number
  pointDelta: number
}
export type UserDisplayInfo = {
  avatarUrl: string | null
  countryCode: string | null
  statusText: string | null
}
export type LeaderboardChallengeData = {
  solves: Map<string, LeaderboardSolve[]>
  dynamicScores: Map<string, LeaderboardDynamicScore[]>
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

export const userIsNotBanned = eq(users.banned, false)
export const nonBannedUserJoin = (ownerId: PgColumn) =>
  and(eq(users.id, ownerId), userIsNotBanned)

const createRankedSolvesForChallenges = (
  db: DatabaseClient,
  challengeIds: string[]
) =>
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
      .innerJoin(users, nonBannedUserJoin(solves.userid))
      .where(
        and(
          inArray(solves.challengeid, challengeIds),
          eq(solves.source, 'flag')
        )
      )
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
  db: DatabaseClient | DatabaseTx,
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

export type ChallengeWithMyScore = Challenge & {
  myScore?: number
  myPointDelta?: number
}

const challengesBaseSelection = {
  id: challenges.id,
  data: challenges.data,
  score: challenges.score,
  solveCount: challenges.solveCount,
}

const preparedPublicChallenges = preparedPerDb(db =>
  db
    .select(challengesBaseSelection)
    .from(challenges)
    .where(challengeIsPublicSql)
    .orderBy(...challengeDefaultOrder)
    .prepare('rctf_public_challenges')
)

const preparedPublicChallengesWithMyScore = preparedPerDb(db =>
  db
    .select({ ...challengesBaseSelection, myScore: solves.points })
    .from(challenges)
    .leftJoin(
      solves,
      and(
        eq(solves.challengeid, challenges.id),
        eq(solves.userid, sql.placeholder('userId'))
      )
    )
    .where(challengeIsPublicSql)
    .orderBy(...challengeDefaultOrder)
    .prepare('rctf_public_challenges_my_score')
)

export const getChallenges = async (
  db: DatabaseClient,
  userId?: string
): Promise<ChallengeWithMyScore[]> => {
  if (!userId) {
    return await preparedPublicChallenges(db).execute()
  }

  const [rows, dynamicScoresByUser] = await Promise.all([
    preparedPublicChallengesWithMyScore(db).execute({ userId }),
    getDynamicScoresForUsers(db, [userId]),
  ])

  const deltaByChallenge = new Map(
    (dynamicScoresByUser.get(userId) ?? []).map(s => [s.id, s.pointDelta])
  )

  return rows.map(({ myScore, ...rest }) => ({
    ...rest,
    myScore: myScore ?? undefined,
    myPointDelta: deltaByChallenge.get(rest.id),
  }))
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

export const lockChallenge = (tx: DatabaseTx, challengeId: string) =>
  tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${challengeId}, 0))`
  )

export const scoringKindOf = (data: {
  scoring?: { kind: ChallengeScoringKind } | null
}): ChallengeScoringKind => data.scoring?.kind ?? ChallengeScoringKind.DECAY

export type DecayChallenge = Pick<Challenge, 'id' | 'data'>
export const isDecayKind = sql`COALESCE(${challenges.data} -> 'scoring' ->> 'kind', ${ChallengeScoringKind.DECAY}) = ${ChallengeScoringKind.DECAY}`

export const getDecayChallenge = (
  tx: DatabaseTx,
  challengeId: string
): Promise<DecayChallenge | undefined> =>
  tx
    .select({ id: challenges.id, data: challenges.data })
    .from(challenges)
    .where(and(eq(challenges.id, challengeId), isDecayKind))
    .limit(1)
    .then(takeUnique)

export const getDecayChallenges = (tx: DatabaseTx): Promise<DecayChallenge[]> =>
  tx
    .select({ id: challenges.id, data: challenges.data })
    .from(challenges)
    .where(isDecayKind)
    .orderBy(asc(challenges.id))

export const countNonBannedSolvesForChallenge = async (
  db: DatabaseClient | DatabaseTx,
  challengeId: string
): Promise<number> => {
  const row = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(solves)
    .innerJoin(users, nonBannedUserJoin(solves.userid))
    .where(and(eq(solves.challengeid, challengeId), eq(solves.source, 'flag')))
    .then(takeUnique)
  return row?.count ?? 0
}

export const getChallengeSolveCount = async (
  db: DatabaseClient | DatabaseTx,
  challengeId: string
): Promise<number> => {
  const row = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(solves)
    .where(eq(solves.challengeid, challengeId))
    .then(takeUnique)
  return row?.count ?? 0
}

export const getMaxSolveCount = async (
  db: DatabaseClient | DatabaseTx
): Promise<number> => {
  // dynamic challenges are excluded
  const perChallenge = db
    .select({ count: sql<number>`COUNT(*)::int`.as('count') })
    .from(solves)
    .innerJoin(users, nonBannedUserJoin(solves.userid))
    .innerJoin(challenges, eq(challenges.id, solves.challengeid))
    .where(isDecayKind)
    .groupBy(solves.challengeid)
    .as('per_challenge')

  const row = await db
    .select({ max: sql<number>`COALESCE(MAX(${perChallenge.count}), 0)::int` })
    .from(perChallenge)
    .then(takeUnique)
  return row?.max ?? 0
}

export const createSolveAndGetBloodNumber = async (
  db: DatabaseClient,
  params: {
    challengeId: string
    userId: string
    submissionIp?: string | null
    submittedFlag?: string
  }
): Promise<number | null> => {
  const solveId = crypto.randomUUID()
  const submissionId = crypto.randomUUID()

  // the leaderboard worker picks up the recompute request and reprices
  // every solver of this challenge on its next tick
  return await db.transaction(async tx => {
    await lockChallenge(tx, params.challengeId)

    // re-check under the lock so a concurrent delete can't orphan this solve
    if (!(await getPrivateChallenge(tx, params.challengeId))) {
      return null
    }

    const priorSolveCount = await countNonBannedSolvesForChallenge(
      tx,
      params.challengeId
    )

    await tx.insert(solves).values({
      id: solveId,
      challengeid: params.challengeId,
      userid: params.userId,
      createdat: sql`NOW()`,
      submissionip: params.submissionIp ?? null,
    })

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

    return priorSolveCount + 1
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
  scoring: { kind: ChallengeScoringKind.DECAY },
}

const defaultInstancerConfig: InstancerConfig = {
  challengeIntegrationId: '',
  config: {},
  expose: [],
  timeoutMilliseconds: 0,
}

export class ChallengeKindChangeBlockedError extends Error {
  constructor(
    public readonly fromKind: ChallengeScoringKind,
    public readonly toKind: ChallengeScoringKind,
    public readonly solveCount: number
  ) {
    super(
      `cannot change scoring kind from ${fromKind} to ${toKind} while ${solveCount} solves exist`
    )
    this.name = 'ChallengeKindChangeBlockedError'
  }
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

  if (current && partial.scoring) {
    const currentKind = current.data.scoring?.kind ?? ChallengeScoringKind.DECAY
    const nextKind = partial.scoring.kind
    if (currentKind !== nextKind) {
      const solveCountRow = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(solves)
        .where(eq(solves.challengeid, id))
        .then(takeUnique)

      const solveCount = solveCountRow?.count ?? 0
      if (solveCount > 0) {
        throw new ChallengeKindChangeBlockedError(
          currentKind,
          nextKind,
          solveCount
        )
      }
    }
  }

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
    await lockChallenge(tx, id)
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
    .innerJoin(users, nonBannedUserJoin(solves.userid))
    .where(and(eq(solves.challengeid, challengeId), eq(solves.source, 'flag')))
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

  const ranked = createRankedSolvesForChallenges(db, [challengeId])
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

export type DynamicScoreRow = {
  userId: string
  userName: string
  userAvatarUrl: string | null
  userCountryCode: string | null
  userStatusText: string | null
  points: number
  pointDelta: number
  globalPlace: number
  division: string
  divisionPlace: number
}

type ChallengeScoresWithPosition = {
  challengeExists: boolean
  scores: DynamicScoreRow[]
  total: number
  myPosition: number | null
}

export const getChallengeScoresWithPosition = async (
  db: DatabaseClient,
  challengeId: string,
  userId: string | null,
  limit: number,
  offset: number
): Promise<ChallengeScoresWithPosition> => {
  const challenge = await getChallenge(db, challengeId)
  if (!challenge) {
    return {
      challengeExists: false,
      scores: [],
      total: 0,
      myPosition: null,
    }
  }

  const ranked = db.$with('ranked').as(
    db
      .select({
        userId: solves.userid,
        userName: users.name,
        userAvatarUrl: users.avatarUrl,
        userCountryCode: users.countryCode,
        userStatusText: users.statusText,
        division: users.division,
        globalRank: users.globalRank,
        divisionRank: users.divisionRank,
        points: solves.points,
        position:
          sql<number>`row_number() over (order by ${solves.points} desc, ${solves.pointsUpdatedAt} asc, ${solves.userid} asc)::int`.as(
            'position'
          ),
      })
      .from(solves)
      .innerJoin(users, nonBannedUserJoin(solves.userid))
      .where(
        and(eq(solves.challengeid, challengeId), eq(solves.source, 'feed'))
      )
  )

  const challengeFeedFilter = and(
    eq(solves.challengeid, challengeId),
    eq(solves.source, 'feed')
  )

  const [pageRows, totalRow] = await Promise.all([
    db
      .with(ranked)
      .select({
        userId: ranked.userId,
        userName: ranked.userName,
        userAvatarUrl: ranked.userAvatarUrl,
        userCountryCode: ranked.userCountryCode,
        userStatusText: ranked.userStatusText,
        division: ranked.division,
        globalRank: ranked.globalRank,
        divisionRank: ranked.divisionRank,
        points: ranked.points,
        position: ranked.position,
        myPosition: sql<
          number | null
        >`(SELECT position FROM ranked WHERE userid = ${userId})`.as(
          'my_position'
        ),
      })
      .from(ranked)
      .orderBy(asc(ranked.position))
      .limit(limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(solves)
      .innerJoin(users, nonBannedUserJoin(solves.userid))
      .where(challengeFeedFilter)
      .then(takeUnique),
  ])

  const total = totalRow?.value ?? 0
  const myPosition = pageRows[0]?.myPosition ?? null

  if (pageRows.length === 0) {
    return { challengeExists: true, scores: [], total, myPosition }
  }

  const deltas = await getLatestDynamicPointDeltasForChallenge(
    db,
    challengeId,
    pageRows.map(r => r.userId)
  )

  return {
    challengeExists: true,
    total,
    myPosition,
    scores: pageRows.map(r => ({
      userId: r.userId,
      userName: r.userName,
      userAvatarUrl: r.userAvatarUrl,
      userCountryCode: r.userCountryCode,
      userStatusText: r.userStatusText,
      points: r.points,
      pointDelta: deltas.get(r.userId) ?? 0,
      globalPlace: r.globalRank ?? 0,
      division: r.division,
      divisionPlace: r.divisionRank ?? 0,
    })),
  }
}

export type ChallengeGraphEntry = {
  id: string
  name: string
  points: { time: number; score: number }[]
}

export const getChallengeScoresGraph = async (
  db: DatabaseClient,
  challengeId: string,
  userIds: string[],
  redis?: TypedRedis
): Promise<ChallengeGraphEntry[]> => {
  if (userIds.length === 0) {
    return []
  }

  const { endTime } = await getCompetitionTiming(db, redis)

  const series = db.$with('series').as(
    db
      .select({
        userId: scoreEvents.userid,
        userName: users.name,
        eventAtMs:
          sql<number>`(EXTRACT(EPOCH FROM ${scoreEvents.eventAt}) * 1000)::bigint`.as(
            'event_at_ms'
          ),
        cumulative:
          sql<number>`SUM(${scoreEvents.pointsDelta}) OVER (PARTITION BY ${scoreEvents.userid} ORDER BY ${scoreEvents.eventAt}, ${scoreEvents.id})::int`.as(
            'cumulative'
          ),
        rn: sql<number>`row_number() OVER (PARTITION BY ${scoreEvents.userid} ORDER BY ${scoreEvents.eventAt}, ${scoreEvents.id})::int`.as(
          'rn'
        ),
        total:
          sql<number>`count(*) OVER (PARTITION BY ${scoreEvents.userid})::int`.as(
            'total'
          ),
      })
      .from(scoreEvents)
      .innerJoin(users, nonBannedUserJoin(scoreEvents.userid))
      .where(
        and(
          eq(scoreEvents.challengeid, challengeId),
          inArray(scoreEvents.userid, userIds)
        )
      )
  )

  const rows = await db
    .with(series)
    .select({
      userId: series.userId,
      userName: series.userName,
      points: sql<Array<{ time: number; score: number }>>`JSONB_AGG(
        JSONB_BUILD_OBJECT('time', ${series.eventAtMs}, 'score', ${series.cumulative})
        ORDER BY ${series.rn}
      )`,
    })
    .from(series)
    // keep the first and last point plus a uniform stride sample so the
    // per-user series is bounded regardless of how many feed ticks fire
    .where(
      sql`${series.rn} = 1 OR ${series.rn} = ${series.total} OR ${series.rn} % GREATEST(1, CEIL(${series.total}::float / ${MAX_GRAPH_POINTS_PER_USER}))::int = 0`
    )
    .groupBy(series.userId, series.userName)

  const rowByUserId = new Map<string, (typeof rows)[number]>()
  for (const row of rows) {
    if (row.userId) {
      rowByUserId.set(row.userId, row)
    }
  }

  const now = Math.min(Date.now(), endTime)
  const result: ChallengeGraphEntry[] = []
  for (const userId of userIds) {
    const row = rowByUserId.get(userId)
    if (!row || row.points.length === 0) {
      continue
    }
    const last = row.points[row.points.length - 1]!
    const points =
      last.time < now
        ? [...row.points, { time: now, score: last.score }]
        : row.points
    result.push({ id: userId, name: row.userName, points })
  }
  return result
}

export const getUserChallengeSolves = async (
  db: DatabaseClient,
  userId: string
): Promise<
  { solve: Solve; challengeData: ChallengeData; bloodIndex: number | null }[]
> => {
  const userChallenges = db.$with('user_challenges').as(
    db
      .selectDistinct({
        challengeId: sql<string>`${solves.challengeid}`.as('uc_cid'),
      })
      .from(solves)
      .where(and(eq(solves.userid, userId), eq(solves.source, 'flag')))
  )

  const ranked = db.$with('ranked').as(
    db
      .with(userChallenges)
      .select({
        solveId: sql<string>`${solves.id}`.as('r_solve_id'),
        position:
          sql<number>`row_number() OVER (PARTITION BY ${solves.challengeid} ORDER BY ${solves.createdat})::int`.as(
            'r_pos'
          ),
      })
      .from(solves)
      .innerJoin(users, nonBannedUserJoin(solves.userid))
      .innerJoin(
        userChallenges,
        eq(userChallenges.challengeId, solves.challengeid)
      )
      .where(eq(solves.source, 'flag'))
  )

  return await db
    .with(userChallenges, ranked)
    .select({
      solve: solves,
      challengeData: challenges.data,
      bloodIndex: sql<
        number | null
      >`CASE WHEN ${ranked.position} BETWEEN 1 AND 3 THEN ${ranked.position} - 1 ELSE NULL END`,
    })
    .from(solves)
    .innerJoin(
      challenges,
      and(eq(challenges.id, solves.challengeid), challengeIsPublicSql)
    )
    .innerJoin(users, nonBannedUserJoin(solves.userid))
    .leftJoin(ranked, eq(ranked.solveId, solves.id))
    .where(and(eq(solves.userid, userId), eq(solves.source, 'flag')))
    .orderBy(desc(solves.createdat))
}

const preparedLeaderboardSolves = preparedPerDb(db =>
  db
    .select({
      userId: solves.userid,
      solves: sql<LeaderboardSolve[]>`JSONB_AGG(JSONB_BUILD_OBJECT(
        'challengeId', ${solves.challengeid},
        'solveTime', (EXTRACT(EPOCH FROM ${solves.createdat}) * 1000)::bigint
      ) ORDER BY ${solves.createdat})`,
    })
    .from(solves)
    .innerJoin(users, nonBannedUserJoin(solves.userid))
    .innerJoin(challenges, eq(challenges.id, solves.challengeid))
    .where(
      and(
        inJsonbArrayPlaceholder(solves.userid, sql.placeholder('userIds')),
        challengeIsPublicSql,
        eq(solves.source, 'flag')
      )
    )
    .groupBy(solves.userid)
    .prepare('rctf_leaderboard_solves')
)

const preparedLeaderboardUserInfo = preparedPerDb(db =>
  db
    .select({
      id: users.id,
      avatarUrl: users.avatarUrl,
      countryCode: users.countryCode,
      statusText: users.statusText,
    })
    .from(users)
    .where(
      and(
        inJsonbArrayPlaceholder(users.id, sql.placeholder('userIds')),
        userIsNotBanned
      )
    )
    .prepare('rctf_leaderboard_user_info')
)

export const getLeaderboardChallengeData = async (
  db: DatabaseClient,
  userIds: string[]
): Promise<LeaderboardChallengeData> => {
  if (userIds.length === 0) {
    return {
      solves: new Map(),
      dynamicScores: new Map(),
      userInfo: new Map(),
    }
  }

  const userIdsJson = JSON.stringify(userIds)
  const [solveRows, userRows, dynamicScores] = await Promise.all([
    preparedLeaderboardSolves(db).execute({ userIds: userIdsJson }),
    preparedLeaderboardUserInfo(db).execute({ userIds: userIdsJson }),
    getDynamicScoresForUsers(db, userIds),
  ])

  const solvesMap = new Map<string, LeaderboardSolve[]>()
  const userInfo = new Map<string, UserDisplayInfo>()

  for (const row of userRows) {
    userInfo.set(row.id, {
      avatarUrl: row.avatarUrl,
      countryCode: row.countryCode,
      statusText: row.statusText,
    })
  }

  for (const row of solveRows) {
    solvesMap.set(row.userId, row.solves)
  }

  return { solves: solvesMap, dynamicScores, userInfo }
}

const preparedDynamicScores = preparedPerDb(db => {
  const latestTick = db.$with('latest_tick').as(
    db
      .select({
        challengeId: sql<string>`${scoreEvents.challengeid}`.as('tick_cid'),
        eventAt: max(scoreEvents.eventAt).as('tick_at'),
      })
      .from(scoreEvents)
      .where(eq(scoreEvents.source, 'feed'))
      .groupBy(scoreEvents.challengeid)
  )

  const deltas = db.$with('deltas').as(
    db
      .with(latestTick)
      .select({
        challengeId: sql<string>`${scoreEvents.challengeid}`.as('d_cid'),
        userId: sql<string>`${scoreEvents.userid}`.as('d_uid'),
        pointDelta: sql<number>`SUM(${scoreEvents.pointsDelta})::int`.as(
          'd_delta'
        ),
      })
      .from(scoreEvents)
      .innerJoin(
        latestTick,
        and(
          eq(latestTick.challengeId, scoreEvents.challengeid),
          eq(latestTick.eventAt, scoreEvents.eventAt)
        )
      )
      .innerJoin(users, nonBannedUserJoin(scoreEvents.userid))
      .where(
        and(
          eq(scoreEvents.source, 'feed'),
          inJsonbArrayPlaceholder(
            scoreEvents.userid,
            sql.placeholder('userIds')
          )
        )
      )
      .groupBy(scoreEvents.challengeid, scoreEvents.userid)
  )

  return db
    .with(latestTick, deltas)
    .select({
      userId: solves.userid,
      // this is a bit silly
      scores: sql<LeaderboardDynamicScore[]>`JSONB_AGG(JSONB_BUILD_OBJECT(
        'id', ${solves.challengeid},
        'points', ${solves.points},
        'pointDelta', COALESCE(${deltas.pointDelta}, 0)
      ))`,
    })
    .from(solves)
    .innerJoin(users, nonBannedUserJoin(solves.userid))
    .innerJoin(
      challenges,
      and(eq(challenges.id, solves.challengeid), challengeIsPublicSql)
    )
    .leftJoin(
      deltas,
      and(
        eq(deltas.challengeId, solves.challengeid),
        eq(deltas.userId, solves.userid)
      )
    )
    .where(
      and(
        inJsonbArrayPlaceholder(solves.userid, sql.placeholder('userIds')),
        eq(solves.source, 'feed')
      )
    )
    .groupBy(solves.userid)
    .prepare('rctf_dynamic_scores')
})

export const getDynamicScoresForUsers = async (
  db: DatabaseClient,
  userIds: string[]
): Promise<Map<string, LeaderboardDynamicScore[]>> => {
  if (userIds.length === 0) {
    return new Map()
  }

  const rows = await preparedDynamicScores(db).execute({
    userIds: JSON.stringify(userIds),
  })

  const result = new Map<string, LeaderboardDynamicScore[]>()
  for (const row of rows) {
    result.set(row.userId, row.scores)
  }
  return result
}

const getLatestDynamicPointDeltasForChallenge = async (
  db: DatabaseClient,
  challengeId: string,
  userIds: string[]
): Promise<Map<string, number>> => {
  if (userIds.length === 0) {
    return new Map()
  }

  const latestTick = db.$with('latest_tick').as(
    db
      .select({ eventAt: max(scoreEvents.eventAt).as('tick_at') })
      .from(scoreEvents)
      .where(
        and(
          eq(scoreEvents.challengeid, challengeId),
          eq(scoreEvents.source, 'feed')
        )
      )
  )

  const rows = await db
    .with(latestTick)
    .select({
      userId: scoreEvents.userid,
      pointDelta: sum(scoreEvents.pointsDelta).mapWith(Number),
    })
    .from(scoreEvents)
    .innerJoin(latestTick, eq(latestTick.eventAt, scoreEvents.eventAt))
    .innerJoin(users, nonBannedUserJoin(scoreEvents.userid))
    .where(
      and(
        eq(scoreEvents.challengeid, challengeId),
        eq(scoreEvents.source, 'feed'),
        inArray(scoreEvents.userid, userIds)
      )
    )
    .groupBy(scoreEvents.userid)

  const result = new Map<string, number>()
  for (const row of rows) {
    if (row.userId) {
      result.set(row.userId, row.pointDelta)
    }
  }
  return result
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
  // For dynamic-flag challenges the flat `flag` field holds the base flag the
  // per-team flags are minted from, so it must be set either way.
  const dynamicFlag = challenge?.data.flags?.dynamic
  if (!challenge || !challenge.data.flag) {
    return res.badChallenge()
  }

  if (scoringKindOf(challenge.data) !== ChallengeScoringKind.DECAY) {
    // we can assign scores by ourselves only for these
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

  // For dynamic flags, verify returns a result code (see DynamicFlagResult):
  // 0 = valid, 1 = valid base but wrong team id/signature, 2 = invalid.
  const dynamicResult = dynamicFlag
    ? verifyDynamicFlag(
        challenge.data.flag,
        params.userId,
        params.challengeId,
        params.flag,
        dynamicFlag.mode,
        config.dynamicFlagSigningKey ?? ''
      )
    : undefined
  const flagIsCorrect =
    dynamicResult !== undefined
      ? dynamicResult === DynamicFlagResult.Valid
      : verifyDefaultFlag(params.flag, challenge.data.flag)
  if (!flagIsCorrect) {
    // A well-formed dynamic flag whose base is correct but whose embedded team
    // id/signature does not match the submitter is the signature of flag
    // sharing, not an ordinary wrong guess — alert on it distinctly.
    const isSharedDynamicFlag =
      dynamicResult === DynamicFlagResult.ValidBaseWrongTeamOrSig
    if (isSharedDynamicFlag) {
      log.warn(
        {
          user: params.userId,
          chall: challenge.id,
          flag: params.flag,
        },
        'dynamic flag with valid base but wrong team/signature; possible flag sharing'
      )
    }
    await createSubmission(db, {
      kind: SubmissionKind.FLAG,
      challengeId: params.challengeId,
      userId: params.userId,
      ip: params.submissionIp,
      result: SubmissionResult.INCORRECT,
      details: {
        submittedFlag: params.flag,
        ...(isSharedDynamicFlag ? { dynamicFlagSharing: true } : {}),
      },
    }).catch(err =>
      log.error(
        { err, challengeId: params.challengeId, userId: params.userId },
        'failed to record incorrect flag submission'
      )
    )
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

  let bloodNumber: number | null
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
      }).catch(err =>
        log.error(
          { err, challengeId: params.challengeId, userId: params.userId },
          'failed to record already-solved flag submission'
        )
      )
      return res.badAlreadySolvedChallenge()
    }
    if (constraintName === 'uuid_fkey') {
      return res.badUnknownUser()
    }
    throw error
  }

  if (bloodNumber === null) {
    return res.badChallenge()
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

  requestChallengeRecompute(redis, params.challengeId, 'flag')
  forceLeaderboardUpdate(redis)
  return res.goodFlag()
}

export const deleteSolve = async (
  db: DatabaseClient,
  params: {
    challengeId: string
    userId: string
  }
): Promise<Solve[]> => {
  return await db.transaction(async tx => {
    await lockChallenge(tx, params.challengeId)

    // share-lock the user row so a concurrent ban can't sweep the same solves
    // we are about to negate
    const targetUser = await tx
      .select({ banned: users.banned })
      .from(users)
      .where(eq(users.id, params.userId))
      .limit(1)
      .for('share')
      .then(takeUnique)

    const removed = await tx
      .delete(solves)
      .where(
        and(
          eq(solves.userid, params.userId),
          eq(solves.challengeid, params.challengeId)
        )
      )
      .returning()

    if (targetUser?.banned === false) {
      const events = removed
        .filter(s => (s.points ?? 0) !== 0)
        .map(s => ({
          id: crypto.randomUUID(),
          challengeid: params.challengeId,
          userid: params.userId,
          pointsDelta: -s.points,
          source: 'delete' as const,
        }))
      if (events.length > 0) {
        await tx.insert(scoreEvents).values(events)
      }
    }

    return removed
  })
}
