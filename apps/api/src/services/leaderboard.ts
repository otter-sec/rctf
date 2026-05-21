import { config } from '@rctf/config'
import type { DatabaseClient } from '@rctf/db'
import { challenges, solves, users } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import type { ScoreContext } from '@rctf/scoring/base'
import { ChallengeScoringKind } from '@rctf/types'
import { and, asc, eq, gt, or, sql } from 'drizzle-orm'
import {
  leaderboardOrderSql,
  userIsPublicRankedSql,
  type CalculatedLeaderboard,
  type InternalChallengeInfo,
  type InternalUserInfo,
  type Sample,
} from '../cache/leaderboard'
import type { TypedRedis } from '../cache/scripts'
import { scoreProvider } from '../providers'
import { challengeIsPublicSql, getSolvesAndUserInfo } from './challenges'
import { getCompetitionTiming, type CompetitionTiming } from './settings'
import { scoringKindOf } from './solve-points'
import { userNameSearchFilter } from './users'

const numberOfBloods = 3

type ExtendedChallengeInfo = InternalChallengeInfo & {
  scoringKind: ChallengeScoringKind
}

type ExtendedUserInfo = InternalUserInfo & {
  solveContribs: Map<string, number>
}

const buildScoreContext = (
  ch: ExtendedChallengeInfo,
  maxSolves: number,
  timing: CompetitionTiming
): ScoreContext => {
  return {
    minPoints: ch.minPoints,
    maxPoints: ch.maxPoints,
    solves: ch.solves,
    maxSolves: maxSolves,
    eventStartTime: timing.startTime,
    eventEndTime: timing.endTime,
    firstSolveTime: ch.firstSolveTime,
  }
}

const timingFingerprint = (timing: CompetitionTiming): string =>
  `${timing.startTime}:${timing.endTime}`

type SolveCursor = {
  createdat: string
  id: string
}

type LeaderboardRuntimeState = {
  providerIdentity: string
  timingFingerprint: string
  challengesFingerprint: string
  userInfos: Map<string, ExtendedUserInfo>
  challengeInfos: Map<string, ExtendedChallengeInfo>
  firstBloods: Map<string, string[]>
  samples: CalculatedLeaderboard['samples']
  lastSampleIsTrailing: boolean
  prevScoreMap: Map<string, number> | null
  processedSolveCount: number
  lastSolveCursor: SolveCursor | null
  firstEverSolveTime: number | null
}

type UserSnapshot = {
  id: string
  name: string
  division: string | null
  banned: boolean
}

type PublicChallengeSnapshot = {
  id: string
  data: {
    name?: string
    category?: string
    tiebreakEligible?: boolean
    points?: {
      min?: number
      max?: number
    }
    sortWeight?: number
    hidden?: boolean
    releaseTime?: number | null
    scoring?:
      | { kind: ChallengeScoringKind.DECAY }
      | { kind: ChallengeScoringKind.DYNAMIC; source: unknown }
  }
}

type SolveRow = {
  id: string
  challengeid: string
  userid: string
  createdat: string
  points: number
}

type LeaderboardRebuildSeed = {
  providerIdentity: string
  timingFingerprint: string
  challengesFingerprint: string
  dbUsers: UserSnapshot[]
  dbChallenges: PublicChallengeSnapshot[]
}

export type CachedLeaderboardComputation = {
  calculated: CalculatedLeaderboard
  changed: boolean
  recomputedFromScratch: boolean
}

const compareUsers = (a: InternalUserInfo, b: InternalUserInfo): number => {
  const scoreDiff = b.score - a.score
  if (scoreDiff !== 0) {
    return scoreDiff
  }

  const lastTiebreakEligibleSolveDiff =
    (a.lastTiebreakEligibleSolve ?? Infinity) -
    (b.lastTiebreakEligibleSolve ?? Infinity)
  if (
    !isNaN(lastTiebreakEligibleSolveDiff) &&
    lastTiebreakEligibleSolveDiff !== 0
  ) {
    return lastTiebreakEligibleSolveDiff
  }

  return (a.lastSolve ?? Infinity) - (b.lastSolve ?? Infinity)
}

const getUsersSnapshot = async (
  db: DatabaseClient
): Promise<UserSnapshot[]> => {
  return await db
    .select({
      id: users.id,
      name: users.name,
      division: users.division,
      banned: users.banned,
    })
    .from(users)
    .orderBy(asc(users.createdAt))
}

const getPublicChallengesSnapshot = async (
  db: DatabaseClient
): Promise<PublicChallengeSnapshot[]> => {
  return await db
    .select({
      id: challenges.id,
      data: challenges.data,
    })
    .from(challenges)
    .where(challengeIsPublicSql)
    .orderBy(asc(challenges.id))
}

const getSolveCount = async (db: DatabaseClient): Promise<number> => {
  const row = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(solves)
    .then(takeUnique)
  return row?.count ?? 0
}

const getAllSolvesOrdered = async (db: DatabaseClient): Promise<SolveRow[]> => {
  return await db
    .select({
      id: solves.id,
      challengeid: solves.challengeid,
      userid: solves.userid,
      createdat: solves.createdat,
      points: solves.points,
    })
    .from(solves)
    .orderBy(asc(solves.createdat), asc(solves.id))
}

const getSolvesAfterCursor = async (
  db: DatabaseClient,
  cursor: SolveCursor | null
): Promise<SolveRow[]> => {
  if (!cursor) {
    return await getAllSolvesOrdered(db)
  }

  return await db
    .select({
      id: solves.id,
      challengeid: solves.challengeid,
      userid: solves.userid,
      createdat: solves.createdat,
      points: solves.points,
    })
    .from(solves)
    .where(
      or(
        gt(solves.createdat, cursor.createdat),
        and(eq(solves.createdat, cursor.createdat), gt(solves.id, cursor.id))
      )
    )
    .orderBy(asc(solves.createdat), asc(solves.id))
}

const patchUsers = (
  state: LeaderboardRuntimeState,
  dbUsers: UserSnapshot[]
): { changed: boolean; needsRebuild: boolean } => {
  let changed = false
  let needsRebuild = false
  const freshIds = new Set<string>()

  for (const user of dbUsers) {
    freshIds.add(user.id)
    const info = state.userInfos.get(user.id)

    if (!info) {
      state.userInfos.set(user.id, {
        id: user.id,
        name: user.name,
        division: user.division ?? null,
        banned: user.banned,
        score: 0,
        lastSolve: undefined,
        lastTiebreakEligibleSolve: undefined,
        solvedChallengeIds: [],
        solveContribs: new Map(),
      })
      continue
    }

    if (info.name !== user.name) {
      info.name = user.name
      changed = true
    }
    if (info.division !== (user.division ?? null)) {
      info.division = user.division ?? null
      changed = true
    }
    if (info.banned !== user.banned) {
      info.banned = user.banned
      changed = true
      needsRebuild = true
    }
  }

  for (const [id, info] of state.userInfos) {
    if (!freshIds.has(id)) {
      state.userInfos.delete(id)
      if (info.lastSolve !== undefined) {
        changed = true
        needsRebuild = true
      }
    }
  }

  return { changed, needsRebuild }
}

const buildChallengesFingerprint = (
  dbChallenges: PublicChallengeSnapshot[]
): string =>
  JSON.stringify(
    dbChallenges.map(ch => [
      ch.id,
      ch.data.name ?? '',
      ch.data.category ?? '',
      ch.data.tiebreakEligible ?? false,
      ch.data.points?.min ?? 0,
      ch.data.points?.max ?? 0,
      ch.data.sortWeight ?? null,
      ch.data.scoring?.kind ?? ChallengeScoringKind.DECAY,
    ])
  )

const createRuntimeState = (
  seed: LeaderboardRebuildSeed,
  timing: CompetitionTiming
): LeaderboardRuntimeState => {
  const userInfos = new Map<string, ExtendedUserInfo>()
  for (const user of seed.dbUsers) {
    userInfos.set(user.id, {
      id: user.id,
      name: user.name,
      division: user.division ?? null,
      banned: user.banned,
      score: 0,
      lastSolve: undefined,
      lastTiebreakEligibleSolve: undefined,
      solvedChallengeIds: [],
      solveContribs: new Map(),
    })
  }

  const challengeInfos = new Map<string, ExtendedChallengeInfo>()
  for (const challenge of seed.dbChallenges) {
    const points = challenge.data.points ?? { min: 0, max: 0 }
    challengeInfos.set(challenge.id, {
      id: challenge.id,
      name: challenge.data.name ?? '',
      category: challenge.data.category ?? '',
      tiebreakEligible: challenge.data.tiebreakEligible ?? false,
      solves: 0,
      score: 0,
      minPoints: points.min ?? 0,
      maxPoints: points.max ?? 0,
      sortWeight: challenge.data.sortWeight ?? null,
      firstSolveTime: null,
      scoringKind: scoringKindOf(challenge.data),
    })
  }

  const runtimeState: LeaderboardRuntimeState = {
    providerIdentity: seed.providerIdentity,
    timingFingerprint: seed.timingFingerprint,
    challengesFingerprint: seed.challengesFingerprint,
    userInfos,
    challengeInfos,
    firstBloods: new Map<string, string[]>(),
    samples: [],
    lastSampleIsTrailing: false,
    prevScoreMap: null,
    processedSolveCount: 0,
    lastSolveCursor: null,
    firstEverSolveTime: null,
  }

  recomputeScores(runtimeState, timing)
  return runtimeState
}

const recomputeScores = (
  state: LeaderboardRuntimeState,
  timing: CompetitionTiming
): void => {
  const maxSolves = scoreProvider.requiredFields.includes('maxSolves')
    ? Math.max(
        0,
        ...Array.from(state.challengeInfos.values()).map(
          challenge => challenge.solves
        )
      )
    : 0

  // calculate decay challenge values
  for (const [, challengeInfo] of state.challengeInfos) {
    if (challengeInfo.scoringKind !== ChallengeScoringKind.DECAY) {
      continue
    }
    challengeInfo.score = scoreProvider.calculate(
      buildScoreContext(challengeInfo, maxSolves, timing)
    )
  }

  // calculate dynamic challenge values
  for (const [, userInfo] of state.userInfos) {
    let total = 0
    for (const challengeId of userInfo.solvedChallengeIds) {
      const challengeInfo = state.challengeInfos.get(challengeId)
      if (!challengeInfo) {
        continue
      }
      total +=
        challengeInfo.scoringKind === ChallengeScoringKind.DYNAMIC
          ? (userInfo.solveContribs.get(challengeId) ?? 0)
          : challengeInfo.score
    }
    userInfo.score = total
  }
}

const buildSampleScoreMap = (
  userScores: Sample['userScores']
): Map<string, number> =>
  new Map(userScores.map(({ id, score }) => [id, score]))

const applySolve = (
  state: LeaderboardRuntimeState,
  solve: SolveRow,
  createdAtMs: number
): boolean => {
  const challengeInfo = state.challengeInfos.get(solve.challengeid)
  const userInfo = state.userInfos.get(solve.userid)
  if (!challengeInfo || !userInfo || userInfo.banned) {
    return false
  }

  let bloods = state.firstBloods.get(solve.challengeid)
  if (!bloods) {
    bloods = []
    state.firstBloods.set(solve.challengeid, bloods)
  }
  if (bloods.length < numberOfBloods) {
    bloods.push(solve.userid)
  }

  if (challengeInfo.firstSolveTime === null) {
    challengeInfo.firstSolveTime = createdAtMs
  }

  challengeInfo.solves++
  userInfo.lastSolve = createdAtMs
  if (challengeInfo.tiebreakEligible) {
    userInfo.lastTiebreakEligibleSolve = createdAtMs
  }
  userInfo.solvedChallengeIds.push(solve.challengeid)

  if (challengeInfo.scoringKind === ChallengeScoringKind.DYNAMIC) {
    userInfo.solveContribs.set(solve.challengeid, solve.points)
  }

  return true
}

const processSolveBatch = (
  state: LeaderboardRuntimeState,
  solveRows: SolveRow[],
  now: number,
  timing: CompetitionTiming
): {
  changed: boolean
  hadUnappliedSolves: boolean
  consumedSolveCount: number
  lastConsumedSolveCursor: SolveCursor | null
} => {
  let solveIndex = 0
  let hadLeaderboardChanges = false
  let hadUnappliedSolves = false
  const graphSampleTime = Math.max(1000, config.leaderboard.graphSampleTime)

  if (state.lastSampleIsTrailing) {
    state.samples.pop()
    state.lastSampleIsTrailing = false

    const prevSample = state.samples[state.samples.length - 1]
    state.prevScoreMap = prevSample
      ? buildSampleScoreMap(prevSample.userScores)
      : null
  }

  const applySolvesUntil = (untilEpochMs: number): void => {
    let changed = false

    for (; solveIndex < solveRows.length; solveIndex++) {
      const solve = solveRows[solveIndex]!
      const createdAtMs = new Date(solve.createdat).valueOf()
      if (createdAtMs > untilEpochMs) {
        break
      }

      if (!applySolve(state, solve, createdAtMs)) {
        hadUnappliedSolves = true
        continue
      }

      changed = true
    }

    if (!changed) {
      return
    }

    recomputeScores(state, timing)
    hadLeaderboardChanges = true
  }

  const runSample = (time: number, isTrailing: boolean): void => {
    applySolvesUntil(time)

    const userScores: Sample['userScores'] = []
    for (const [id, userInfo] of state.userInfos) {
      if (userInfo.score > 0) {
        userScores.push({ id, score: userInfo.score })
      }
    }

    if (state.prevScoreMap !== null) {
      const changed =
        userScores.length !== state.prevScoreMap.size ||
        userScores.some(s => state.prevScoreMap!.get(s.id) !== s.score)

      if (!changed) {
        return
      }
    }

    state.prevScoreMap = buildSampleScoreMap(userScores)
    state.samples.push({ time, userScores })
    state.lastSampleIsTrailing = isTrailing
  }

  const end = Math.min(
    Math.floor(timing.endTime / graphSampleTime) * graphSampleTime,
    now
  )

  if (state.firstEverSolveTime === null && solveRows.length > 0) {
    state.firstEverSolveTime = new Date(solveRows[0]!.createdat).valueOf()
  }

  if (state.firstEverSolveTime !== null) {
    const effectiveStart = Math.max(timing.startTime, state.firstEverSolveTime)
    const start = Math.ceil(effectiveStart / graphSampleTime) * graphSampleTime
    const lastProcessedSolveTime =
      state.lastSolveCursor !== null
        ? new Date(state.lastSolveCursor.createdat).valueOf()
        : null

    const loopStart =
      lastProcessedSolveTime !== null
        ? Math.max(
            start,
            Math.ceil(lastProcessedSolveTime / graphSampleTime) *
              graphSampleTime
          )
        : start

    for (let i = loopStart; i <= end; i += graphSampleTime) {
      runSample(i, false)

      if (solveIndex >= solveRows.length) {
        break
      }
    }
  }

  if (solveIndex < solveRows.length || end !== timing.endTime) {
    runSample(Math.min(now, timing.endTime), true)
  }

  const lastConsumedSolve =
    solveIndex > 0 ? solveRows[solveIndex - 1] : undefined

  return {
    changed: hadLeaderboardChanges,
    hadUnappliedSolves,
    consumedSolveCount: solveIndex,
    lastConsumedSolveCursor: lastConsumedSolve
      ? {
          createdat: lastConsumedSolve.createdat,
          id: lastConsumedSolve.id,
        }
      : null,
  }
}

const cloneCalculatedLeaderboard = (
  state: LeaderboardRuntimeState
): CalculatedLeaderboard => {
  const usersWithScores = Array.from(state.userInfos.values())
    .filter(userInfo => !userInfo.banned && userInfo.lastSolve !== undefined)
    .sort(compareUsers)
    .map(userInfo => ({
      id: userInfo.id,
      name: userInfo.name,
      division: userInfo.division,
      score: userInfo.score,
      hadAnySolve: true,
      lastSolve: userInfo.lastSolve,
      lastTiebreakEligibleSolve: userInfo.lastTiebreakEligibleSolve,
    }))

  const challengeInfos: CalculatedLeaderboard['challengeInfos'] = new Map()
  for (const [id, challengeInfo] of state.challengeInfos) {
    challengeInfos.set(id, {
      score: challengeInfo.score,
      solves: challengeInfo.solves,
      name: challengeInfo.name,
      category: challengeInfo.category,
      sortWeight: challengeInfo.sortWeight,
    })
  }

  const samples = state.samples.map(sample => ({
    time: sample.time,
    userScores: sample.userScores.map(userScore => ({ ...userScore })),
  }))

  return {
    users: usersWithScores,
    challengeInfos,
    samples,
  }
}

const rebuildRuntimeState = async (
  db: DatabaseClient,
  seed: LeaderboardRebuildSeed,
  now: number,
  timing: CompetitionTiming
): Promise<LeaderboardRuntimeState> => {
  const state = createRuntimeState(seed, timing)
  const allSolves = await getAllSolvesOrdered(db)

  const batchResult = processSolveBatch(state, allSolves, now, timing)
  state.processedSolveCount = batchResult.consumedSolveCount
  state.lastSolveCursor = batchResult.lastConsumedSolveCursor

  return state
}

export const getCurrentScoreProviderIdentity = (): string =>
  `${config.scoreProvider.name}@${scoreProvider.revision}`

export const calculateLeaderboard = async (
  db: DatabaseClient,
  redis?: TypedRedis
): Promise<CalculatedLeaderboard> => {
  const now = Date.now()
  const providerIdentity = getCurrentScoreProviderIdentity()
  const [dbUsers, dbChallenges, timing] = await Promise.all([
    getUsersSnapshot(db),
    getPublicChallengesSnapshot(db),
    getCompetitionTiming(db, redis),
  ])
  const runtimeState = await rebuildRuntimeState(
    db,
    {
      providerIdentity,
      timingFingerprint: timingFingerprint(timing),
      challengesFingerprint: buildChallengesFingerprint(dbChallenges),
      dbUsers,
      dbChallenges,
    },
    now,
    timing
  )
  return cloneCalculatedLeaderboard(runtimeState)
}

export const createCachedLeaderboardCalculator = (redis?: TypedRedis) => {
  let state: LeaderboardRuntimeState | null = null
  return async (
    db: DatabaseClient,
    providerIdentityOverride?: string
  ): Promise<CachedLeaderboardComputation> => {
    const now = Date.now()
    const providerIdentity =
      providerIdentityOverride ?? getCurrentScoreProviderIdentity()
    const [dbUsers, dbChallenges, timing] = await Promise.all([
      getUsersSnapshot(db),
      getPublicChallengesSnapshot(db),
      getCompetitionTiming(db, redis),
    ])

    const challengesFingerprint = buildChallengesFingerprint(dbChallenges)
    const currentTimingFingerprint = timingFingerprint(timing)

    const rebuild = async (): Promise<CachedLeaderboardComputation> => {
      const [freshUsers, freshChallenges, freshTiming] = await Promise.all([
        getUsersSnapshot(db),
        getPublicChallengesSnapshot(db),
        getCompetitionTiming(db, redis),
      ])
      state = await rebuildRuntimeState(
        db,
        {
          providerIdentity,
          timingFingerprint: timingFingerprint(freshTiming),
          challengesFingerprint: buildChallengesFingerprint(freshChallenges),
          dbUsers: freshUsers,
          dbChallenges: freshChallenges,
        },
        now,
        freshTiming
      )

      return {
        calculated: cloneCalculatedLeaderboard(state),
        changed: true,
        recomputedFromScratch: true,
      }
    }

    if (!state) {
      return await rebuild()
    }

    if (state.providerIdentity !== providerIdentity) {
      return await rebuild()
    }

    if (state.timingFingerprint !== currentTimingFingerprint) {
      return await rebuild()
    }

    if (state.challengesFingerprint !== challengesFingerprint) {
      return await rebuild()
    }

    const userPatch = patchUsers(state, dbUsers)
    if (userPatch.needsRebuild) {
      return await rebuild()
    }

    const deltaSolves = await getSolvesAfterCursor(db, state.lastSolveCursor)

    if (deltaSolves.length === 0) {
      const totalSolves = await getSolveCount(db)
      if (totalSolves !== state.processedSolveCount) {
        return await rebuild()
      }

      const dynamicRefresh = await refreshDynamicContribs(db, state, timing)
      if (dynamicRefresh.needsRebuild) {
        return await rebuild()
      }
      return {
        calculated: cloneCalculatedLeaderboard(state),
        changed: userPatch.changed || dynamicRefresh.changed,
        recomputedFromScratch: false,
      }
    }

    const totalSolves = await getSolveCount(db)
    const expectedDelta = totalSolves - state.processedSolveCount
    if (deltaSolves.length !== expectedDelta) {
      return await rebuild()
    }

    const batchResult = processSolveBatch(state, deltaSolves, now, timing)
    if (batchResult.hadUnappliedSolves) {
      return await rebuild()
    }

    state.processedSolveCount += batchResult.consumedSolveCount
    if (batchResult.lastConsumedSolveCursor) {
      state.lastSolveCursor = batchResult.lastConsumedSolveCursor
    }

    const dynamicRefresh = await refreshDynamicContribs(db, state, timing)
    if (dynamicRefresh.needsRebuild) {
      return await rebuild()
    }
    return {
      calculated: cloneCalculatedLeaderboard(state),
      changed:
        batchResult.changed || userPatch.changed || dynamicRefresh.changed,
      recomputedFromScratch: false,
    }
  }
}

const dropDynamicContrib = (
  userInfo: ExtendedUserInfo,
  challengeId: string
): void => {
  userInfo.solveContribs.delete(challengeId)
  userInfo.solvedChallengeIds = userInfo.solvedChallengeIds.filter(
    id => id !== challengeId
  )
}

type RefreshResult = { changed: boolean; needsRebuild: boolean }

const refreshDynamicContribs = async (
  db: DatabaseClient,
  state: LeaderboardRuntimeState,
  timing: CompetitionTiming
): Promise<RefreshResult> => {
  const dynamicIds = new Set(
    Array.from(state.challengeInfos.values())
      .filter(info => info.scoringKind === ChallengeScoringKind.DYNAMIC)
      .map(info => info.id)
  )
  if (dynamicIds.size === 0) {
    return { changed: false, needsRebuild: false }
  }

  const rows = await db
    .select({
      challengeid: solves.challengeid,
      userid: solves.userid,
      points: solves.points,
    })
    .from(solves)
    .where(
      sql`${solves.challengeid} IN (${sql.join(
        Array.from(dynamicIds, id => sql`${id}`),
        sql`, `
      )})`
    )

  const contribKey = (userId: string, challengeId: string) =>
    `${userId}|${challengeId}`
  const dbContribs = new Map<string, number>()
  for (const row of rows) {
    const userInfo = state.userInfos.get(row.userid)
    if (!userInfo || userInfo.banned) {
      continue
    }

    dbContribs.set(contribKey(row.userid, row.challengeid), row.points)
  }

  let changed = false
  for (const userInfo of state.userInfos.values()) {
    for (const challengeId of dynamicIds) {
      const dbPoints = dbContribs.get(contribKey(userInfo.id, challengeId))
      const memPoints = userInfo.solveContribs.get(challengeId)
      if (dbPoints === memPoints) {
        continue
      }

      if (dbPoints === undefined) {
        dropDynamicContrib(userInfo, challengeId)
        changed = true
        continue
      }

      if (memPoints === undefined) {
        // a dynamic solve exists in the db that wasn't picked up by
        // processSolveBatch this tick
        return { changed: true, needsRebuild: true }
      }

      userInfo.solveContribs.set(challengeId, dbPoints)
      changed = true
    }
  }

  if (changed) {
    recomputeScores(state, timing)
  }
  return { changed, needsRebuild: false }
}

export const searchLeaderboard = async (
  db: DatabaseClient,
  search: string,
  limit: number,
  offset: number,
  division?: string
) => {
  const searchFilter = userNameSearchFilter(search)

  const whereClause = and(
    searchFilter,
    userIsPublicRankedSql,
    division ? eq(users.division, division) : undefined
  )

  const [totalRow, matchingUsers] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereClause)
      .then(takeUnique),
    db
      .select({
        id: users.id,
        name: users.name,
        division: users.division,
        score: users.score,
        globalRank: users.globalRank,
        divisionRank: users.divisionRank,
      })
      .from(users)
      .where(whereClause)
      .orderBy(
        sql`similarity(${users.name}, ${search}) DESC`,
        asc(users.createdAt)
      )
      .limit(limit)
      .offset(offset),
  ])

  const total = totalRow?.count ?? 0
  if (matchingUsers.length === 0) {
    return { total, leaderboard: [] }
  }

  const userIds = matchingUsers.map(u => u.id)
  const { solves: userSolves, userInfo } = await getSolvesAndUserInfo(
    db,
    userIds
  )

  return {
    total,
    leaderboard: matchingUsers.map(entry => {
      const info = userInfo.get(entry.id)
      return {
        id: entry.id,
        name: entry.name,
        division: entry.division,
        score: entry.score,
        divisionPlace: entry.divisionRank ?? 0,
        globalPlace: entry.globalRank ?? null,
        avatarUrl: info?.avatarUrl ?? null,
        countryCode: info?.countryCode ?? null,
        statusText: info?.statusText ?? null,
        solves: Array.from(userSolves.get(entry.id) ?? []).map(solve => ({
          id: solve.challengeId,
          solveTime: solve.solveTime,
        })),
      }
    }),
  }
}

export const getLeaderboardWithTotal = async (
  db: DatabaseClient,
  limit: number,
  offset: number,
  division?: string
) => {
  const whereClause = and(
    userIsPublicRankedSql,
    division ? eq(users.division, division) : undefined
  )

  const [totalRow, leaderboard] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereClause)
      .then(takeUnique),
    limit > 0
      ? db
          .select({
            id: users.id,
            name: users.name,
            score: users.score,
            division: users.division,
            divisionRank: users.divisionRank,
            globalRank: users.globalRank,
            avatarUrl: users.avatarUrl,
            countryCode: users.countryCode,
            statusText: users.statusText,
          })
          .from(users)
          .where(whereClause)
          .orderBy(leaderboardOrderSql)
          .limit(limit)
          .offset(offset)
      : Promise.resolve([]),
  ])

  const total = totalRow?.count ?? 0

  const teamIds = leaderboard.map(e => e.id)
  const { solves: userSolves } =
    teamIds.length > 0
      ? await getSolvesAndUserInfo(db, teamIds)
      : { solves: new Map<string, never[]>() }

  return {
    total,
    leaderboard: leaderboard.map(entry => ({
      id: entry.id,
      name: entry.name,
      division: entry.division,
      score: entry.score,
      divisionPlace: entry.divisionRank ?? 0,
      globalPlace: entry.globalRank ?? null,
      avatarUrl: entry.avatarUrl ?? null,
      countryCode: entry.countryCode ?? null,
      statusText: entry.statusText ?? null,
      solves: Array.from(userSolves.get(entry.id) ?? []).map(solve => ({
        id: solve.challengeId,
        solveTime: solve.solveTime,
      })),
    })),
  }
}
