import { solves, users, type DatabaseClient } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import { ChallengeScoringKind } from '@rctf/types'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import {
  leaderboardOrderSql,
  userIsPublicRankedSql,
} from '../cache/leaderboard'
import { preparedPerDb } from '../lib/prepared'
import { scoringKindOf } from './challenge-queries'
import { getChallenge, getLeaderboardChallengeData } from './challenges'
import { userNameSearchFilter } from './users'

type LeaderboardEntryRow = Pick<
  typeof users.$inferSelect,
  'id' | 'name' | 'division' | 'score' | 'globalRank' | 'divisionRank'
>

const leaderboardEntrySelection = {
  id: users.id,
  name: users.name,
  score: users.score,
  division: users.division,
  divisionRank: users.divisionRank,
  globalRank: users.globalRank,
}

const hydrateLeaderboardEntries = async (
  db: DatabaseClient,
  entries: LeaderboardEntryRow[]
) => {
  if (entries.length === 0) {
    return []
  }

  const {
    solves: userSolves,
    dynamicScores,
    userInfo,
  } = await getLeaderboardChallengeData(
    db,
    entries.map(entry => entry.id)
  )

  return entries.map(entry => {
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
  })
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
      .select(leaderboardEntrySelection)
      .from(users)
      .where(whereClause)
      .orderBy(
        sql`similarity(${users.name}, ${search}) DESC`,
        asc(users.createdAt)
      )
      .limit(limit)
      .offset(offset),
  ])

  return {
    total: totalRow?.count ?? 0,
    leaderboard: await hydrateLeaderboardEntries(db, matchingUsers),
  }
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

  return {
    total: totalRow?.count ?? 0,
    leaderboard: await hydrateLeaderboardEntries(db, leaderboard),
  }
}

export const getChallengeLeaderboardWithTotal = async (
  db: DatabaseClient,
  challengeId: string,
  limit: number,
  offset: number,
  division?: string,
  search?: string
) => {
  const challenge = await getChallenge(db, challengeId)
  if (!challenge) {
    return { total: 0, leaderboard: [] }
  }

  const whereClause = and(
    userIsPublicRankedSql,
    division ? eq(users.division, division) : undefined,
    search ? userNameSearchFilter(search) : undefined
  )
  const solveJoin = and(
    eq(solves.userid, users.id),
    eq(solves.challengeid, challengeId)
  )
  const orderBy =
    scoringKindOf(challenge.data) === ChallengeScoringKind.DYNAMIC
      ? [desc(solves.points), asc(solves.pointsUpdatedAt), asc(solves.userid)]
      : [asc(solves.createdat), asc(solves.userid)]

  const [totalRow, leaderboard] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .innerJoin(solves, solveJoin)
      .where(whereClause)
      .then(takeUnique),
    db
      .select(leaderboardEntrySelection)
      .from(users)
      .innerJoin(solves, solveJoin)
      .where(whereClause)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
  ])

  return {
    total: totalRow?.count ?? 0,
    leaderboard: await hydrateLeaderboardEntries(db, leaderboard),
  }
}

type LeaderboardFilters = {
  limit: number
  offset: number
  division?: string
  search?: string
  challenge?: string
}

export const getLeaderboardWithFilters = (
  db: DatabaseClient,
  { limit, offset, division, search, challenge }: LeaderboardFilters
) => {
  if (challenge) {
    return getChallengeLeaderboardWithTotal(
      db,
      challenge,
      limit,
      offset,
      division,
      search
    )
  }

  if (search) {
    return searchLeaderboard(db, search, limit, offset, division)
  }

  return getLeaderboardWithTotal(db, limit, offset, division)
}
