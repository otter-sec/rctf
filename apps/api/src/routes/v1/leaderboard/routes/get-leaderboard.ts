import { config } from '@rctf/config'
import { GetLeaderboardRoute } from '@rctf/types'
import { getLeaderboard } from '../../../../cache/leaderboard'
import leaderboardGroup from '../group'

leaderboardGroup.route(
  GetLeaderboardRoute,
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

    const { total, leaderboard } = await getLeaderboard(
      ctx.var.redis,
      limit,
      offset,
      division
    )
    return res.goodLeaderboard({ total, leaderboard })
  }
)
