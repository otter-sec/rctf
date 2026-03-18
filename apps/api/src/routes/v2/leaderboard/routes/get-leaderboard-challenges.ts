import { challenges } from '@rctf/db'
import { GetLeaderboardChallengesRouteV2 } from '@rctf/types'
import { sql } from 'drizzle-orm'
import { challengeIsPublicSql } from '../../../../services/challenges'
import leaderboardGroup from '../group'

leaderboardGroup.route(
  GetLeaderboardChallengesRouteV2,
  async ({ ctx, res }) => {
    const rows = await ctx.var.db
      .select({
        id: challenges.id,
        data: challenges.data,
        score: challenges.score,
        solveCount: challenges.solveCount,
        firstBloodIds: sql<string[]>`
          COALESCE((
            SELECT ARRAY_AGG(first_blood.userid ORDER BY first_blood.createdat ASC, first_blood.id ASC)
            FROM (
              SELECT userid, createdat, id
              FROM solves
              WHERE solves.challengeid = challenges.id
              ORDER BY createdat ASC, id ASC
              LIMIT 3
            ) AS first_blood
          ), ARRAY[]::text[])
        `.as('first_blood_ids'),
      })
      .from(challenges)
      .where(challengeIsPublicSql)

    return res.goodLeaderboardChallenges({
      challenges: Object.fromEntries(
        rows.map(row => [
          row.id,
          {
            name: row.data.name ?? '',
            category: row.data.category ?? '',
            points: row.score ?? 0,
            solves: row.solveCount ?? 0,
            sortWeight: row.data.sortWeight ?? null,
            firstSolvers: (row.firstBloodIds ?? []).map(id => ({ id })),
          },
        ])
      ),
    })
  }
)
