import { config } from '@rctf/config'
import { GetChallengeSolvesRouteV2 } from '@rctf/types'
import {
  getChallenge,
  getChallengeSolves,
} from '../../../../services/challenges'
import challsGroup from '../group'

challsGroup.route(
  GetChallengeSolvesRouteV2,
  async ({ res, ctx, params, query }) => {
    // NOTE: Handling manually because the values are loaded from config
    if (
      query.limit > config.leaderboard.maxLimit ||
      query.offset > config.leaderboard.maxOffset
    ) {
      return res.badBody({
        reason: 'Invalid limit or offset',
      })
    }

    const [challenge, solves] = await Promise.all([
      getChallenge(ctx.var.db, params.id),
      getChallengeSolves(ctx.var.db, params.id, query.limit, query.offset),
    ])

    if (!challenge) {
      return res.badChallenge()
    }

    return res.goodChallengeSolves({
      solves: solves.map(({ solve, userName, userAvatarUrl }) => ({
        id: solve.id,
        createdAt: new Date(solve.createdat).getTime(),
        userId: solve.userid,
        userName,
        userAvatarUrl,
      })),
    })
  }
)
