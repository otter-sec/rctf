import { GetLeaderboardChallengesRouteV2 } from '@rctf/types'
import { getCachedChallengesWithBloods } from '../../../../cache/leaderboard'
import leaderboardGroup from '../group'

leaderboardGroup.route(
  GetLeaderboardChallengesRouteV2,
  async ({ ctx, res }) => {
    const challenges = await getCachedChallengesWithBloods(ctx.var.redis)

    return res.goodLeaderboardChallenges({
      challenges: Object.fromEntries(
        Object.entries(challenges).map(([id, info]) => [
          id,
          {
            name: info.name ?? '',
            category: info.category ?? '',
            points: info.score ?? 0,
            solves: info.solves ?? 0,
            sortWeight: info.sortWeight,
            firstSolvers: info.firstBloods.map(id => ({ id })),
          },
        ])
      ),
    })
  }
)
