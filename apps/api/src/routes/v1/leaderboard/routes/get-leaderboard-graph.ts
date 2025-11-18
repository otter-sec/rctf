import { GetLeaderboardGraphRoute } from '@rctf/types'
import { getGraph } from '../../../../cache/leaderboard'
import leaderboardGroup from '../group'

leaderboardGroup.route(
  GetLeaderboardGraphRoute,
  async ({ ctx, res, query: { limit, division } }) => {
    const graph = await getGraph(ctx.var.redis, limit, division)
    return res.goodLeaderboardGraph({ graph })
  }
)
