import { config } from '@rctf/config'
import { GetLeaderboardGraphRoute } from '@rctf/types'
import { getGraph } from '../../../../cache/leaderboard'
import leaderboardGroup from '../group'

leaderboardGroup.route(
  GetLeaderboardGraphRoute,
  async ({ ctx, res, query: { limit, division } }) => {
    // NOTE: Handling manually because the value is loaded from config
    if (limit > config.leaderboard.graphMaxTeams) {
      return res.badBody({
        reason: 'Invalid limit',
      })
    }

    const graph = await getGraph(ctx.var.redis, limit, division)
    return res.goodLeaderboardGraph({ graph })
  }
)
