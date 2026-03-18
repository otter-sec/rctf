import { config } from '@rctf/config'
import { GetLeaderboardWithGraphRoute } from '@rctf/types'
import { getGraph, getGraphForEntries } from '../../../../cache/leaderboard'
import {
  getLeaderboardWithTotal,
  searchLeaderboard,
} from '../../../../services/leaderboard'
import { rateLimitSearch } from '../../../../services/rate-limit'
import leaderboardGroup from '../group'

leaderboardGroup.route(
  GetLeaderboardWithGraphRoute,
  async ({ ctx, res, query: { limit, offset, division, search } }) => {
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

    if (search) {
      const timeLeft = await rateLimitSearch(ctx.var.redis, ctx.var.ip)
      if (timeLeft) {
        return res.badRateLimit({ timeLeft })
      }

      const { total, leaderboard } = await searchLeaderboard(
        ctx.var.db,
        search,
        limit,
        offset,
        division
      )
      const graph = await getGraphForEntries(ctx.var.redis, leaderboard)
      return res.goodLeaderboardWithGraph({ graph, total, leaderboard })
    }

    const [graph, { total, leaderboard }] = await Promise.all([
      getGraph(ctx.var.db, ctx.var.redis, limit, offset, division),
      getLeaderboardWithTotal(ctx.var.db, limit, offset, division),
    ])

    return res.goodLeaderboardWithGraph({ graph, total, leaderboard })
  }
)
