import type { DatabaseClient } from '@rctf/db'
import { challenges, solves, users } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import { and, asc, desc, eq, sql } from 'drizzle-orm'

const toNullableString = (
  value: Date | string | null | undefined
): string | null => {
  if (!value) {
    return null
  }
  return typeof value === 'string' ? value : value.toISOString()
}

export const getAdminStats = async (db: DatabaseClient) => {
  const now = Date.now()
  const challengeHiddenSql = sql<boolean>`coalesce((${challenges.data} ->> 'hidden')::boolean, false)`
  const challengeReleaseTimeSql = sql<number>`coalesce((${challenges.data} ->> 'releaseTime')::bigint, 0)`
  const challengePublicSql = sql`${challengeHiddenSql} = false AND ${challengeReleaseTimeSql} <= ${now}`
  const challengeCategorySql = sql<string>`coalesce(nullif(${challenges.data} ->> 'category', ''), 'Uncategorized')`
  const challengeNameSql = sql<string>`coalesce(nullif(${challenges.data} ->> 'name', ''), ${challenges.id})`
  const validSolveCountSql = sql<number>`count(${users.id})::int`

  const [
    teamStats,
    challengeStats,
    solvedChallengeStats,
    solveStats,
    scoreStats,
    topTeams,
    topChallenges,
    categories,
    recentSolves,
  ] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${users.banned} = false)::int`,
        banned: sql<number>`count(*) filter (where ${users.banned} = true)::int`,
        admins: sql<number>`count(*) filter (where ${users.perms} != 0)::int`,
        scored: sql<number>`count(*) filter (where ${users.globalRank} is not null AND ${users.banned} = false)::int`,
      })
      .from(users)
      .then(takeUnique),
    db
      .select({
        total: sql<number>`count(*)::int`,
        visible: sql<number>`count(*) filter (where ${challengePublicSql})::int`,
        hidden: sql<number>`count(*) filter (where ${challengeHiddenSql} = true)::int`,
        scheduled: sql<number>`count(*) filter (where ${challengeHiddenSql} = false AND ${challengeReleaseTimeSql} > ${now})::int`,
      })
      .from(challenges)
      .then(takeUnique),
    db
      .select({
        count: sql<number>`count(distinct ${solves.challengeid})::int`,
      })
      .from(solves)
      .innerJoin(challenges, eq(challenges.id, solves.challengeid))
      .innerJoin(
        users,
        and(eq(users.id, solves.userid), eq(users.banned, false))
      )
      .then(takeUnique),
    db
      .select({
        total: sql<number>`count(${solves.id})::int`,
        accepted: sql<number>`count(${solves.id}) filter (where ${users.banned} = false)::int`,
        scoreboard: sql<number>`count(${solves.id}) filter (where ${users.banned} = false AND ${challengePublicSql})::int`,
        banned: sql<number>`count(${solves.id}) filter (where ${users.banned} = true)::int`,
        firstAt: sql<string | null>`min(${solves.createdat})`,
        latestAt: sql<string | null>`max(${solves.createdat})`,
      })
      .from(solves)
      .leftJoin(users, eq(users.id, solves.userid))
      .leftJoin(challenges, eq(challenges.id, solves.challengeid))
      .then(takeUnique),
    db
      .select({
        total: sql<number>`coalesce(sum(${users.score}), 0)::int`,
        average: sql<number>`coalesce(round(avg(${users.score})), 0)::int`,
        highest: sql<number>`coalesce(max(${users.score}), 0)::int`,
      })
      .from(users)
      .where(sql`${users.globalRank} is not null AND ${users.banned} = false`)
      .then(takeUnique),
    db
      .select({
        id: users.id,
        name: users.name,
        division: users.division,
        score: users.score,
        solveCount: sql<number>`count(${solves.id})::int`,
        globalRank: sql<number>`${users.globalRank}::int`,
      })
      .from(users)
      .leftJoin(solves, eq(users.id, solves.userid))
      .where(sql`${users.globalRank} is not null AND ${users.banned} = false`)
      .groupBy(users.id)
      .orderBy(asc(users.globalRank))
      .limit(5),
    db
      .select({
        id: challenges.id,
        name: challengeNameSql,
        category: challengeCategorySql,
        score: challenges.score,
        solveCount: validSolveCountSql,
      })
      .from(challenges)
      .leftJoin(solves, eq(challenges.id, solves.challengeid))
      .leftJoin(
        users,
        and(eq(users.id, solves.userid), eq(users.banned, false))
      )
      .groupBy(challenges.id)
      .orderBy(
        desc(validSolveCountSql),
        desc(challenges.score),
        asc(challenges.id)
      )
      .limit(5),
    db
      .select({
        name: challengeCategorySql,
        challengeCount: sql<number>`count(distinct ${challenges.id})::int`,
        solveCount: validSolveCountSql,
      })
      .from(challenges)
      .leftJoin(solves, eq(challenges.id, solves.challengeid))
      .leftJoin(
        users,
        and(eq(users.id, solves.userid), eq(users.banned, false))
      )
      .groupBy(challengeCategorySql)
      .orderBy(desc(validSolveCountSql), asc(challengeCategorySql)),
    db
      .select({
        id: solves.id,
        createdAt: solves.createdat,
        userId: users.id,
        userName: users.name,
        challengeId: challenges.id,
        challengeName: challengeNameSql,
        challengeCategory: challengeCategorySql,
      })
      .from(solves)
      .innerJoin(
        users,
        and(eq(users.id, solves.userid), eq(users.banned, false))
      )
      .innerJoin(challenges, eq(challenges.id, solves.challengeid))
      .orderBy(desc(solves.createdat))
      .limit(8),
  ])

  const teams = teamStats ?? {
    total: 0,
    active: 0,
    banned: 0,
    admins: 0,
    scored: 0,
  }
  const challengesData = challengeStats ?? {
    total: 0,
    visible: 0,
    hidden: 0,
    scheduled: 0,
  }
  const solved = solvedChallengeStats?.count ?? 0

  return {
    teams,
    challenges: {
      ...challengesData,
      solved,
      unsolved: Math.max(0, challengesData.total - solved),
    },
    solves: {
      total: solveStats?.total ?? 0,
      accepted: solveStats?.accepted ?? 0,
      scoreboard: solveStats?.scoreboard ?? 0,
      banned: solveStats?.banned ?? 0,
      firstAt: toNullableString(solveStats?.firstAt),
      latestAt: toNullableString(solveStats?.latestAt),
    },
    scores: {
      total: scoreStats?.total ?? 0,
      average: scoreStats?.average ?? 0,
      highest: scoreStats?.highest ?? 0,
    },
    topTeams,
    topChallenges,
    categories,
    recentSolves,
  }
}
