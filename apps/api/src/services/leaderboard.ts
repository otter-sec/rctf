import { config } from '@rctf/config'
import type { DatabaseClient } from '@rctf/db'
import { challenges, solves, users } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import type { ScoreContext } from '@rctf/scoring/base'
import { ChallengeScoringKind } from '@rctf/types'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import {
  leaderboardOrderSql,
  userIsPublicRankedSql,
  type CalculatedLeaderboard,
  type InternalChallengeInfo,
  type InternalUserInfo,
  type Sample,
} from '../cache/leaderboard'
import type { TypedRedis } from '../cache/scripts'
import { cursorAfter, type RowCursor } from '../lib/db-filters'
import { preparedPerDb } from '../lib/prepared'
import { scoreProvider } from '../providers'
import {
  challengeIsPublicSql,
  getLeaderboardChallengeData,
  nonBannedUserJoin,
  scoringKindOf,
} from './challenges'
import { getCompetitionTiming, type CompetitionTiming } from './settings'
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
): ScoreContext => ({
  minPoints: ch.minPoints,
  maxPoints: ch.maxPoints,
  solves: ch.solves,
  maxSolves,
  eventStartTime: timing.startTime,
  eventEndTime: timing.endTime,
  firstSolveTime: ch.firstSolveTime,
})

const timingFingerprint = (timing: CompetitionTiming): string =>
  `${timing.startTime}:${timing.endTime}`

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
  lastSolveCursor: RowCursor | null
  firstEverSolveTime: number | null
  lastDynamicPointCursor: RowCursor | null
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
  pointsUpdatedAt: string
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

const userInfoFromSnapshot = (user: UserSnapshot): ExtendedUserInfo => ({
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

const challengeInfoFromSnapshot = (
  challenge: PublicChallengeSnapshot
): ExtendedChallengeInfo => {
  const points = challenge.data.points ?? { min: 0, max: 0 }
  return {
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
  }
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

const getUsersSnapshot = (db: DatabaseClient): Promise<UserSnapshot[]> =>
  db
    .select({
      id: users.id,
      name: users.name,
      division: users.division,
      banned: users.banned,
    })
    .from(users)
    .orderBy(asc(users.createdAt))

const getPublicChallengesSnapshot = (
  db: DatabaseClient
): Promise<PublicChallengeSnapshot[]> =>
  db
    .select({
      id: challenges.id,
      data: challenges.data,
    })
    .from(challenges)
    .where(challengeIsPublicSql)
    .orderBy(asc(challenges.id))

const getSolveCount = async (db: DatabaseClient): Promise<number> =>
  (
    await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(solves)
      .then(takeUnique)
  )?.count ?? 0

const getSolvesAfterCursor = (
  db: DatabaseClient,
  cursor: RowCursor | null
): Promise<SolveRow[]> =>
  db
    .select({
      id: solves.id,
      challengeid: solves.challengeid,
      userid: solves.userid,
      createdat: solves.createdat,
      points: solves.points,
      pointsUpdatedAt: solves.pointsUpdatedAt,
    })
    .from(solves)
    .where(cursorAfter(solves.createdat, solves.id, cursor))
    .orderBy(asc(solves.createdat), asc(solves.id))

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
      state.userInfos.set(user.id, userInfoFromSnapshot(user))
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
  const userInfos = new Map(
    seed.dbUsers.map(u => [u.id, userInfoFromSnapshot(u)])
  )
  const challengeInfos = new Map(
    seed.dbChallenges.map(ch => [ch.id, challengeInfoFromSnapshot(ch)])
  )

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
    lastDynamicPointCursor: null,
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
  for (const challengeInfo of state.challengeInfos.values()) {
    if (challengeInfo.scoringKind !== ChallengeScoringKind.DECAY) {
      continue
    }
    challengeInfo.score = scoreProvider.calculate(
      buildScoreContext(challengeInfo, maxSolves, timing)
    )
  }

  // calculate dynamic challenge values
  for (const userInfo of state.userInfos.values()) {
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

  const bloods = state.firstBloods.get(solve.challengeid) ?? []
  state.firstBloods.set(solve.challengeid, bloods)
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
    const pointCursor = { time: solve.pointsUpdatedAt, id: solve.id }
    if (
      state.lastDynamicPointCursor === null ||
      pointCursor.time > state.lastDynamicPointCursor.time ||
      (pointCursor.time === state.lastDynamicPointCursor.time &&
        pointCursor.id > state.lastDynamicPointCursor.id)
    ) {
      state.lastDynamicPointCursor = pointCursor
    }
  }

  return true
}

const getDynamicChallengeIds = (state: LeaderboardRuntimeState): string[] =>
  Array.from(state.challengeInfos.values())
    .filter(info => info.scoringKind === ChallengeScoringKind.DYNAMIC)
    .map(info => info.id)

const processSolveBatch = (
  state: LeaderboardRuntimeState,
  solveRows: SolveRow[],
  now: number,
  timing: CompetitionTiming
): {
  changed: boolean
  hadUnappliedSolves: boolean
  consumedSolveCount: number
  lastConsumedSolveCursor: RowCursor | null
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

  const applySolvesUntil = (
    untilEpochMs: number,
    drainRemaining: boolean
  ): void => {
    let changed = false

    for (; solveIndex < solveRows.length; solveIndex++) {
      const solve = solveRows[solveIndex]!
      const createdAtMs = new Date(solve.createdat).valueOf()
      if (createdAtMs > untilEpochMs) {
        if (!drainRemaining) {
          break
        }

        // dynamic challenges accept late deliveries
        const ch = state.challengeInfos.get(solve.challengeid)
        if (!ch || ch.scoringKind !== ChallengeScoringKind.DYNAMIC) {
          hadUnappliedSolves = true
          continue
        }
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
    applySolvesUntil(time, isTrailing)

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
        ? new Date(state.lastSolveCursor.time).valueOf()
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
      ? { time: lastConsumedSolve.createdat, id: lastConsumedSolve.id }
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

  return {
    users: usersWithScores,
    challengeInfos: new Map(
      Array.from(state.challengeInfos, ([id, ch]) => [
        id,
        {
          score: ch.score,
          solves: ch.solves,
          name: ch.name,
          category: ch.category,
          sortWeight: ch.sortWeight,
        },
      ])
    ),
    samples: state.samples.map(sample => ({
      time: sample.time,
      userScores: sample.userScores.map(userScore => ({ ...userScore })),
    })),
  }
}

const rebuildRuntimeState = async (
  db: DatabaseClient,
  seed: LeaderboardRebuildSeed,
  now: number,
  timing: CompetitionTiming
): Promise<LeaderboardRuntimeState> => {
  const state = createRuntimeState(seed, timing)
  const allSolves = await getSolvesAfterCursor(db, null)

  const batchResult = processSolveBatch(state, allSolves, now, timing)
  state.processedSolveCount = batchResult.consumedSolveCount
  state.lastSolveCursor = batchResult.lastConsumedSolveCursor

  return state
}

export const getCurrentScoreProviderIdentity = (): string =>
  `${config.scoreProvider.name}@${scoreProvider.revision}`

const loadLeaderboardSeed = async (
  db: DatabaseClient,
  redis: TypedRedis | undefined,
  providerIdentity = getCurrentScoreProviderIdentity()
): Promise<{ seed: LeaderboardRebuildSeed; timing: CompetitionTiming }> => {
  const [dbUsers, dbChallenges, timing] = await Promise.all([
    getUsersSnapshot(db),
    getPublicChallengesSnapshot(db),
    getCompetitionTiming(db, redis),
  ])
  return {
    timing,
    seed: {
      providerIdentity,
      timingFingerprint: timingFingerprint(timing),
      challengesFingerprint: buildChallengesFingerprint(dbChallenges),
      dbUsers,
      dbChallenges,
    },
  }
}

export const calculateLeaderboard = async (
  db: DatabaseClient,
  redis?: TypedRedis
): Promise<CalculatedLeaderboard> => {
  const now = Date.now()
  const { seed, timing } = await loadLeaderboardSeed(db, redis)
  const runtimeState = await rebuildRuntimeState(db, seed, now, timing)
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
    const { seed, timing } = await loadLeaderboardSeed(
      db,
      redis,
      providerIdentity
    )

    const rebuild = async (): Promise<CachedLeaderboardComputation> => {
      const fresh = await loadLeaderboardSeed(db, redis, providerIdentity)
      state = await rebuildRuntimeState(db, fresh.seed, now, fresh.timing)

      return {
        calculated: cloneCalculatedLeaderboard(state),
        changed: true,
        recomputedFromScratch: true,
      }
    }

    if (
      !state ||
      state.providerIdentity !== seed.providerIdentity ||
      state.timingFingerprint !== seed.timingFingerprint ||
      state.challengesFingerprint !== seed.challengesFingerprint
    ) {
      return await rebuild()
    }

    const userPatch = patchUsers(state, seed.dbUsers)
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

    const dynamicPointCursorBeforeBatch = state.lastDynamicPointCursor
    const batchResult = processSolveBatch(state, deltaSolves, now, timing)
    if (batchResult.hadUnappliedSolves) {
      return await rebuild()
    }

    state.processedSolveCount += batchResult.consumedSolveCount
    if (batchResult.lastConsumedSolveCursor) {
      state.lastSolveCursor = batchResult.lastConsumedSolveCursor
    }

    state.lastDynamicPointCursor = dynamicPointCursorBeforeBatch
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

type RefreshResult = { changed: boolean; needsRebuild: boolean }

const refreshDynamicContribs = async (
  db: DatabaseClient,
  state: LeaderboardRuntimeState,
  timing: CompetitionTiming
): Promise<RefreshResult> => {
  const dynamicIds = getDynamicChallengeIds(state)
  if (dynamicIds.length === 0) {
    return { changed: false, needsRebuild: false }
  }

  let changed = false

  // seeks the (pointsUpdatedAt, id) index then filters by dynamicIds and banned in-memory
  // assumes the cursor range is small relative to total solves
  const currentRows = await db
    .select({
      id: solves.id,
      challengeid: solves.challengeid,
      userid: solves.userid,
      points: solves.points,
      pointsUpdatedAt: solves.pointsUpdatedAt,
    })
    .from(solves)
    .innerJoin(users, nonBannedUserJoin(solves.userid))
    .where(
      and(
        inArray(solves.challengeid, dynamicIds),
        cursorAfter(
          solves.pointsUpdatedAt,
          solves.id,
          state.lastDynamicPointCursor
        )
      )
    )
    .orderBy(asc(solves.pointsUpdatedAt), asc(solves.id))

  for (const row of currentRows) {
    const userInfo = state.userInfos.get(row.userid)
    const pointCursor = { time: row.pointsUpdatedAt, id: row.id }
    if (!userInfo || userInfo.banned) {
      state.lastDynamicPointCursor = pointCursor
      continue
    }

    const memPoints = userInfo.solveContribs.get(row.challengeid)
    if (memPoints === undefined) {
      // a dynamic solve exists in the db that wasn't picked up by
      // processSolveBatch this tick
      return { changed: true, needsRebuild: true }
    }

    if (memPoints !== row.points) {
      userInfo.solveContribs.set(row.challengeid, row.points)
      changed = true
    }
    state.lastDynamicPointCursor = pointCursor
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
  const {
    solves: userSolves,
    dynamicScores,
    userInfo,
  } = await getLeaderboardChallengeData(db, userIds)

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
        dynamicScores: dynamicScores.get(entry.id) ?? [],
      }
    }),
  }
}

const leaderboardEntrySelection = {
  id: users.id,
  name: users.name,
  score: users.score,
  division: users.division,
  divisionRank: users.divisionRank,
  globalRank: users.globalRank,
  avatarUrl: users.avatarUrl,
  countryCode: users.countryCode,
  statusText: users.statusText,
}

const divisionWhereClause = and(
  userIsPublicRankedSql,
  eq(users.division, sql.placeholder('division'))
)

const preparedLeaderboardQueries = preparedPerDb(db => ({
  count: db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(userIsPublicRankedSql)
    .prepare('rctf_leaderboard_count'),
  divisionCount: db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(divisionWhereClause)
    .prepare('rctf_leaderboard_count_division'),
  page: db
    .select(leaderboardEntrySelection)
    .from(users)
    .where(userIsPublicRankedSql)
    .orderBy(leaderboardOrderSql)
    .limit(sql.placeholder('limit'))
    .offset(sql.placeholder('offset'))
    .prepare('rctf_leaderboard_page'),
  divisionPage: db
    .select(leaderboardEntrySelection)
    .from(users)
    .where(divisionWhereClause)
    .orderBy(leaderboardOrderSql)
    .limit(sql.placeholder('limit'))
    .offset(sql.placeholder('offset'))
    .prepare('rctf_leaderboard_page_division'),
}))

export const getLeaderboardWithTotal = async (
  db: DatabaseClient,
  limit: number,
  offset: number,
  division?: string
) => {
  const prepared = preparedLeaderboardQueries(db)

  const [totalRow, leaderboard] = await Promise.all([
    (division
      ? prepared.divisionCount.execute({ division })
      : prepared.count.execute()
    ).then(takeUnique),
    limit > 0
      ? division
        ? prepared.divisionPage.execute({ division, limit, offset })
        : prepared.page.execute({ limit, offset })
      : Promise.resolve([]),
  ])

  const total = totalRow?.count ?? 0

  const teamIds = leaderboard.map(e => e.id)
  const { solves: userSolves, dynamicScores } =
    teamIds.length > 0
      ? await getLeaderboardChallengeData(db, teamIds)
      : {
          solves: new Map<string, never[]>(),
          dynamicScores: new Map<string, never[]>(),
        }

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
      dynamicScores: dynamicScores.get(entry.id) ?? [],
    })),
  }
}
