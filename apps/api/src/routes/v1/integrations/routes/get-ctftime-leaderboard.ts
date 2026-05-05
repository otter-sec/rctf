import { users } from '@rctf/db'
import { GetCtftimeLeaderboardRoute } from '@rctf/types'
import {
  leaderboardOrderSql,
  userIsPublicRankedSql,
} from '../../../../cache/leaderboard'
import integrationsGroup from '../group'

integrationsGroup.route(GetCtftimeLeaderboardRoute, async ({ ctx, res }) => {
  const leaderboard = await ctx.var.db
    .select({
      name: users.name,
      score: users.score,
    })
    .from(users)
    .where(userIsPublicRankedSql)
    .orderBy(leaderboardOrderSql)

  return res.goodCtftimeLeaderboard({
    standings: leaderboard.map((item, index) => ({
      pos: index + 1,
      team: item.name,
      score: item.score ?? 0,
    })),
  })
})
