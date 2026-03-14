import { config } from '@rctf/config'
import { GetLeaderboardWithGraphRoute } from '@rctf/types'
import { getGraph } from '../../../../cache/leaderboard'
import { getLeaderboardWithTotal } from '../../../../services/leaderboard'
import leaderboardGroup from '../group'

leaderboardGroup.route(
  GetLeaderboardWithGraphRoute,
  async ({ ctx, res, query: { limit, offset, division } }) => {
    // NOTE: Handling manually because the value is loaded from config
    if (
      limit > config.leaderboard.graphWithListLimit ||
      offset > config.leaderboard.maxOffset
    ) {
      return res.badBody({
        reason: 'Invalid limit or offset',
      })
    }

    if (division && !Object.hasOwn(config.divisions, division)) {
      return res.badBody({
        reason: 'Invalid division',
      })
    }

    // TODO(es3n1n): i think we can combine multiple queries into single redis pipeline here,
    //  probably same goes for the postgres
    const [graph, { total, leaderboard }] = await Promise.all([
      getGraph(ctx.var.redis, limit, offset, division),
      getLeaderboardWithTotal(
        ctx.var.redis,
        ctx.var.db,
        limit,
        offset,
        division
      ),
    ])

    return res.goodLeaderboardWithGraph({ graph, total, leaderboard })
  }
)
