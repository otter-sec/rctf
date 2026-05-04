import { config } from '@rctf/config'
import type { DatabaseClient } from '@rctf/db'
import { challenges, solves, users } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import type { ScoreContext } from '@rctf/scoring/base'
import { and, asc, eq, gt, or, sql } from 'drizzle-orm'
import {
  leaderboardOrderSql,
  userIsRankedSql,
  type CalculatedLeaderboard,
  type InternalChallengeInfo,
  type InternalUserInfo,
  type Sample,
} from '../cache/leaderboard'
import { scoreProvider } from '../providers'
import { challengeIsPublicSql, getSolvesAndUserInfo } from './challenges'
import { userNameSearchFilter } from './users'

const numberOfBloods = 3

const buildScoreContext = (
  ch: InternalChallengeInfo,
  maxSolves: number
): ScoreContext => {
  return {
    minPoints: ch.minPoints,
    maxPoints: ch.maxPoints,
    solves: ch.solves,
    maxSolves: maxSolves,
    eventStartTime: config.startTime,
    eventEndTime: config.endTime,
    firstSolveTime: ch.firstSolveTime,
  }
}

type SolveCursor = {
  createdat: string
  id: string
}

type LeaderboardRuntimeState = {
  providerIdentity: string
  challengesFingerprint: string
  userInfos: Map<string, InternalUserInfo>
  challengeInfos: Map<string, InternalChallengeInfo>
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
  }
}

type SolveRow = {
  id: string
  challengeid: string
  userid: string
  createdat: string
}

type LeaderboardRebuildSeed = {
  providerIdentity: string
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
  // 1. Score difference
  const scoreDiff = b.score - a.score
  if (scoreDiff !== 0) {
    return scoreDiff
  }

  // 2. Last tiebreak eligible solve difference
  const lastTiebreakEligibleSolveDiff =
    (a.lastTiebreakEligibleSolve ?? Infinity) -
    (b.lastTiebreakEligibleSolve ?? Infinity)
  if (
    !isNaN(lastTiebreakEligibleSolveDiff) &&
    lastTiebreakEligibleSolveDiff !== 0
  ) {
    return lastTiebreakEligibleSolveDiff
  }

  // 3. Last solve difference
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
): boolean => {
  let changed = false
  const freshIds = new Set<string>()

  for (const user of dbUsers) {
    freshIds.add(user.id)
    const info = state.userInfos.get(user.id)

    if (!info) {
      state.userInfos.set(user.id, {
        id: user.id,
        name: user.name,
        division: user.division ?? null,
        score: 0,
        lastSolve: undefined,
        lastTiebreakEligibleSolve: undefined,
        solvedChallengeIds: [],
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
  }

  for (const [id, info] of state.userInfos) {
    if (!freshIds.has(id)) {
      state.userInfos.delete(id)
      // only counts as a visible change if they were on the leaderboard
      if (info.lastSolve !== undefined) {
        changed = true
      }
    }
  }

  return changed
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
    ])
  )

const createRuntimeState = (
  seed: LeaderboardRebuildSeed
): LeaderboardRuntimeState => {
  const userInfos = new Map<string, InternalUserInfo>()
  for (const user of seed.dbUsers) {
    userInfos.set(user.id, {
      id: user.id,
      name: user.name,
      division: user.division ?? null,
      score: 0,
      lastSolve: undefined,
      lastTiebreakEligibleSolve: undefined,
      solvedChallengeIds: [],
    })
  }

  const challengeInfos = new Map<string, InternalChallengeInfo>()
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
    })
  }

  const runtimeState: LeaderboardRuntimeState = {
    providerIdentity: seed.providerIdentity,
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

  recomputeScores(runtimeState)
  return runtimeState
}

const recomputeScores = (state: LeaderboardRuntimeState): void => {
  const maxSolves = scoreProvider.requiredFields.includes('maxSolves')
    ? Math.max(
        0,
        ...Array.from(state.challengeInfos.values()).map(
          challenge => challenge.solves
        )
      )
    : 0

  for (const [, challengeInfo] of state.challengeInfos) {
    challengeInfo.score = scoreProvider.calculate(
      buildScoreContext(challengeInfo, maxSolves)
    )
  }

  for (const [, userInfo] of state.userInfos) {
    userInfo.score = 0
    for (const challengeId of userInfo.solvedChallengeIds) {
      const challengeInfo = state.challengeInfos.get(challengeId)
      if (!challengeInfo) {
        continue
      }

      userInfo.score += challengeInfo.score
    }
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
  if (!challengeInfo || !userInfo) {
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

  return true
}

const processSolveBatch = (
  state: LeaderboardRuntimeState,
  solveRows: SolveRow[],
  now: number
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

    recomputeScores(state)
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
    Math.floor(config.endTime / graphSampleTime) * graphSampleTime,
    now
  )

  if (state.firstEverSolveTime === null && solveRows.length > 0) {
    state.firstEverSolveTime = new Date(solveRows[0]!.createdat).valueOf()
  }

  if (state.firstEverSolveTime !== null) {
    const effectiveStart = Math.max(config.startTime, state.firstEverSolveTime)
    const start = Math.ceil(effectiveStart / graphSampleTime) * graphSampleTime
    const lastProcessedSolveTime =
      state.lastSolveCursor !== null
        ? new Date(state.lastSolveCursor.createdat).valueOf()
        : null

    // samples are point-in-time snapshots,
    //  so later solves do not rewrite earlier boundaries
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

  if (solveIndex < solveRows.length || end !== config.endTime) {
    runSample(Math.min(now, config.endTime), true)
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
    .filter(userInfo => userInfo.lastSolve !== undefined)
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
  now: number
): Promise<LeaderboardRuntimeState> => {
  const state = createRuntimeState(seed)
  const allSolves = await getAllSolvesOrdered(db)

  const batchResult = processSolveBatch(state, allSolves, now)
  state.processedSolveCount = batchResult.consumedSolveCount
  state.lastSolveCursor = batchResult.lastConsumedSolveCursor

  return state
}

export const getCurrentScoreProviderIdentity = (): string =>
  `${config.scoreProvider.name}@${scoreProvider.revision}`

export const calculateLeaderboard = async (
  db: DatabaseClient
): Promise<CalculatedLeaderboard> => {
  const now = Date.now()
  const providerIdentity = getCurrentScoreProviderIdentity()
  const [dbUsers, dbChallenges] = await Promise.all([
    getUsersSnapshot(db),
    getPublicChallengesSnapshot(db),
  ])
  const runtimeState = await rebuildRuntimeState(
    db,
    {
      providerIdentity,
      challengesFingerprint: buildChallengesFingerprint(dbChallenges),
      dbUsers,
      dbChallenges,
    },
    now
  )
  return cloneCalculatedLeaderboard(runtimeState)
}

export const createCachedLeaderboardCalculator = () => {
  let state: LeaderboardRuntimeState | null = null
  return async (
    db: DatabaseClient,
    providerIdentityOverride?: string
  ): Promise<CachedLeaderboardComputation> => {
    const now = Date.now()
    const providerIdentity =
      providerIdentityOverride ?? getCurrentScoreProviderIdentity()
    const [dbUsers, dbChallenges] = await Promise.all([
      getUsersSnapshot(db),
      getPublicChallengesSnapshot(db),
    ])

    const challengesFingerprint = buildChallengesFingerprint(dbChallenges)

    const rebuild = async (): Promise<CachedLeaderboardComputation> => {
      const [freshUsers, freshChallenges] = await Promise.all([
        getUsersSnapshot(db),
        getPublicChallengesSnapshot(db),
      ])
      state = await rebuildRuntimeState(
        db,
        {
          providerIdentity,
          challengesFingerprint: buildChallengesFingerprint(freshChallenges),
          dbUsers: freshUsers,
          dbChallenges: freshChallenges,
        },
        now
      )

      return {
        calculated: cloneCalculatedLeaderboard(state),
        changed: true,
        recomputedFromScratch: true,
      }
    }

    // initial
    if (!state) {
      return await rebuild()
    }

    // provider changed
    if (state.providerIdentity !== providerIdentity) {
      return await rebuild()
    }

    // challenges changed
    if (state.challengesFingerprint !== challengesFingerprint) {
      return await rebuild()
    }

    // user changes don't affect scoring
    const usersChanged = patchUsers(state, dbUsers)
    const deltaSolves = await getSolvesAfterCursor(db, state.lastSolveCursor)

    if (deltaSolves.length === 0) {
      // verify no solves were deleted while none were added
      const totalSolves = await getSolveCount(db)
      if (totalSolves !== state.processedSolveCount) {
        return await rebuild()
      }

      return {
        calculated: cloneCalculatedLeaderboard(state),
        changed: usersChanged,
        recomputedFromScratch: false,
      }
    }

    // validate delta matches expected count (detects deletes + re-inserts)
    const totalSolves = await getSolveCount(db)
    const expectedDelta = totalSolves - state.processedSolveCount
    if (deltaSolves.length !== expectedDelta) {
      return await rebuild()
    }

    const batchResult = processSolveBatch(state, deltaSolves, now)
    if (batchResult.hadUnappliedSolves) {
      return await rebuild()
    }

    state.processedSolveCount += batchResult.consumedSolveCount
    if (batchResult.lastConsumedSolveCursor) {
      state.lastSolveCursor = batchResult.lastConsumedSolveCursor
    }

    return {
      calculated: cloneCalculatedLeaderboard(state),
      changed: batchResult.changed || usersChanged,
      recomputedFromScratch: false,
    }
  }
}

export const searchLeaderboard = async (
  db: DatabaseClient,
  search: string,
  limit: number,
  offset: number,
  division?: string
) => {
  const searchFilter = userNameSearchFilter(search)

  // only include users on the leaderboard (have ranks assigned by the leaderboard worker)
  const whereClause = and(
    searchFilter,
    userIsRankedSql,
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
    userIsRankedSql,
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
