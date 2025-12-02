import { config } from '@rctf/config'
import { GetChallengeSolvesRouteV2 } from '@rctf/types'
import { getChallengeSolvesWithPosition } from '../../../../services/challenges'
import challsGroup from '../group'

challsGroup.route(
  GetChallengeSolvesRouteV2,
  async ({ res, ctx, params, query, user }) => {
    // NOTE: Handling manually because the values are loaded from config
    if (
      query.limit > config.leaderboard.maxLimit ||
      query.offset > config.leaderboard.maxOffset
    ) {
      return res.badBody({
        reason: 'Invalid limit or offset',
      })
    }

    const { challengeExists, solves, solvePosition } =
      await getChallengeSolvesWithPosition(
        ctx.var.db,
        params.id,
        user.id,
        query.limit,
        query.offset
      )

    if (!challengeExists) {
      return res.badChallenge()
    }

    return res.goodChallengeSolves({
      solves: solves.map(solve => ({
        id: solve.id,
        createdAt: new Date(solve.createdAt).getTime(),
        userId: solve.userId,
        userName: solve.userName,
        userAvatarUrl: solve.userAvatarUrl,
      })),
      mySolvePosition: solvePosition,
    })
  }
)
