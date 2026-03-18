import { config } from '@rctf/config'
import { GetLeaderboardRouteV2 } from '@rctf/types'
import {
  getLeaderboardWithTotal,
  searchLeaderboard,
} from '../../../../services/leaderboard'
import { rateLimitSearch } from '../../../../services/rate-limit'
import leaderboardGroup from '../group'

leaderboardGroup.route(
  GetLeaderboardRouteV2,
  async ({ ctx, res, query: { limit, offset, division, search } }) => {
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

    if (search) {
      const timeLeft = await rateLimitSearch(ctx.var.redis, ctx.var.ip)
      if (timeLeft) {
        return res.badRateLimit({ timeLeft })
      }

      return res.goodLeaderboard(
        await searchLeaderboard(ctx.var.db, search, limit, offset, division)
      )
    }

    return res.goodLeaderboard(
      await getLeaderboardWithTotal(ctx.var.db, limit, offset, division)
    )
  }
)
