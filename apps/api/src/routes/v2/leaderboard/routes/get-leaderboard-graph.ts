import { config } from '@rctf/config'
import { GetLeaderboardGraphRouteV2 } from '@rctf/types'
import { getGraph } from '../../../../cache/leaderboard'
import { getUserAvatars } from '../../../../services/users'
import leaderboardGroup from '../group'

leaderboardGroup.route(
  GetLeaderboardGraphRouteV2,
  async ({ ctx, res, query: { limit, division } }) => {
    if (limit > config.leaderboard.graphMaxTeams) {
      return res.badBody({
        reason: 'Invalid limit',
      })
    }

    const graph = await getGraph(ctx.var.redis, limit, division)
    const avatars = await getUserAvatars(
      ctx.var.db,
      graph.map(e => e.id)
    )

    return res.goodLeaderboardGraph({
      graph: graph.map(entry => ({
        ...entry,
        avatarUrl: avatars.get(entry.id) ?? null,
      })),
    })
  }
)
