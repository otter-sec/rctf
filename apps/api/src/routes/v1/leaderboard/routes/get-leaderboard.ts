import { GetLeaderboardRoute } from '@rctf/types'
import { getLeaderboard } from '../../../../cache/leaderboard'
import leaderboardGroup from '../group'

leaderboardGroup.route(
  GetLeaderboardRoute,
  async ({ ctx, res, query: { limit, offset, division } }) => {
    const { total, leaderboard } = await getLeaderboard(
      ctx.var.redis,
      limit,
      offset,
      division
    )
    return res.goodLeaderboard({ total, leaderboard })
  }
)
