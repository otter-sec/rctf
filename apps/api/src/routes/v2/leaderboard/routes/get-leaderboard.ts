import { config } from '@rctf/config'
import { GetLeaderboardRouteV2 } from '@rctf/types'
import { getLeaderboardWithTotal } from '../../../../services/leaderboard'
import leaderboardGroup from '../group'

leaderboardGroup.route(
  GetLeaderboardRouteV2,
  async ({ ctx, res, query: { limit, offset, division } }) => {
    if (
      limit > config.leaderboard.maxLimit ||
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

    return res.goodLeaderboard(
      await getLeaderboardWithTotal(
        ctx.var.redis,
        ctx.var.db,
        limit,
        offset,
        division
      )
    )
  }
)
