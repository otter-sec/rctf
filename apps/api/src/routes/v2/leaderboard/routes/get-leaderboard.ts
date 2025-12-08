import { config } from '@rctf/config'
import { GetLeaderboardRouteV2 } from '@rctf/types'
import { getLeaderboard } from '../../../../cache/leaderboard'
import { getSolvesAndAvatars } from '../../../../services/challenges'
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

    if (division && !config.divisions[division]) {
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
    const { solves, avatars } = await getSolvesAndAvatars(
      ctx.var.db,
      leaderboard.map(e => e.id)
    )

    return res.goodLeaderboard({
      total,
      leaderboard: leaderboard.map(entry => ({
        ...entry,
        avatarUrl: avatars.get(entry.id) ?? null,
        solves: Array.from(solves.get(entry.id) ?? []).map(solve => ({
          id: solve.challengeId,
          solveTime: solve.solveTime,
        })),
      })),
    })
  }
)
