import { config } from '@rctf/config'
import { GetLeaderboardRouteV2 } from '@rctf/types'
import { getLeaderboard } from '../../../../cache/leaderboard'
import { getUserAvatars } from '../../../../services/users'
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

    const { total, leaderboard } = await getLeaderboard(
      ctx.var.redis,
      limit,
      offset,
      division
    )
    const avatars = await getUserAvatars(
      ctx.var.db,
      leaderboard.map(e => e.id)
    )

    return res.goodLeaderboard({
      total,
      leaderboard: leaderboard.map(entry => ({
        ...entry,
        avatarUrl: avatars.get(entry.id) ?? null,
      })),
    })
  }
)
