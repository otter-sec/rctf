import { config } from '@rctf/config'
import { GetLeaderboardRouteV2 } from '@rctf/types'
import { getLeaderboardWithChallenges } from '../../../../cache/leaderboard'
import { getSolvesAvatarsBloods } from '../../../../services/challenges'
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

    const { total, leaderboard, challenges } =
      await getLeaderboardWithChallenges(ctx.var.redis, limit, offset, division)
    const { solves, avatars, firstSolvers } = await getSolvesAvatarsBloods(
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
      challenges: Object.fromEntries(
        Object.entries(challenges).map(([id, info]) => [
          id,
          {
            name: info.name ?? '',
            category: info.category ?? '',
            points: info.score ?? 0,
            solves: info.solves ?? 0,
            firstSolvers: Array.from(firstSolvers.get(id) ?? []).map(id => ({
              id,
            })),
            sortWeight: info.sortWeight,
          },
        ])
      ),
    })
  }
)
