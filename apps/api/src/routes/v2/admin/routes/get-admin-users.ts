import { solves, users } from '@rctf/db'
import { GetAdminUsersRouteV2 } from '@rctf/types'
import { count, eq } from 'drizzle-orm'
import { getFullLeaderboard } from '../../../../cache/leaderboard'
import adminGroup from '../group'

adminGroup.route(
  GetAdminUsersRouteV2,
  async ({ ctx, res, query: { limit, offset } }) => {
    const { leaderboard } = await getFullLeaderboard(ctx.var.redis)
    const userScores = new Map(leaderboard.map(e => [e.id, e.score]))

    const [countResult, dbUsers] = await Promise.all([
      ctx.var.db.select({ count: count() }).from(users),
      ctx.var.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          division: users.division,
          perms: users.perms,
          avatarUrl: users.avatarUrl,
          countryCode: users.countryCode,
          statusText: users.statusText,
          createdAt: users.createdAt,
          solveCount: count(solves.id),
        })
        .from(users)
        .leftJoin(solves, eq(users.id, solves.userid))
        .groupBy(users.id),
    ])

    // Sort by score descending, then by solveCount, then by createdAt
    const sortedUsers = dbUsers
      .map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        division: u.division,
        perms: u.perms,
        score: userScores.get(u.id) ?? 0,
        solveCount: u.solveCount,
        avatarUrl: u.avatarUrl,
        countryCode: u.countryCode,
        statusText: u.statusText,
        createdAt: u.createdAt,
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        if (b.solveCount !== a.solveCount) return b.solveCount - a.solveCount
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      .slice(offset, offset + limit)

    return res.goodAdminUsers({
      total: countResult[0]?.count ?? 0,
      users: sortedUsers,
    })
  }
)
