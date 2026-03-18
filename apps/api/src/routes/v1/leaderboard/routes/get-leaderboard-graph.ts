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

    if (division && !Object.hasOwn(config.divisions, division)) {
      return res.badBody({
        reason: 'Invalid division',
      })
    }

    const graph = await getGraph(ctx.var.db, ctx.var.redis, limit, 0, division)
    return res.goodLeaderboardGraph({ graph })
  }
)
