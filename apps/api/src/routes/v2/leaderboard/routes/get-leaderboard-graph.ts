import { config } from '@rctf/config'
import { GetLeaderboardGraphRouteV2 } from '@rctf/types'
import { getGraph } from '../../../../cache/leaderboard'
import leaderboardGroup from '../group'

leaderboardGroup.route(
  GetLeaderboardGraphRouteV2,
  async ({ ctx, res, query: { limit, offset, division } }) => {
    // NOTE: Handling manually because the value is loaded from config
    if (limit > config.leaderboard.graphMaxTeams) {
      return res.badBody({
        reason: 'Invalid limit',
      })
    }

    const graph = await getGraph(ctx.var.redis, limit, offset, division)
    return res.goodLeaderboardGraph({ graph })
  }
)
