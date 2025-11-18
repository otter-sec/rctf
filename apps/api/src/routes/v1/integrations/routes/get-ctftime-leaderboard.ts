import { GetCtftimeLeaderboardRoute } from '@rctf/types'
import { getFullLeaderboard } from '../../../../cache/leaderboard'
import integrationsGroup from '../group'

integrationsGroup.route(GetCtftimeLeaderboardRoute, async ({ ctx, res }) => {
  const { leaderboard } = await getFullLeaderboard(ctx.var.redis)

  return res.goodCtftimeLeaderboard({
    standings: leaderboard.map((item, index) => ({
      pos: index + 1,
      team: item.name,
      score: item.score,
    })),
  })
})
