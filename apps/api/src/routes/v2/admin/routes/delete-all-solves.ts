import { DeleteAllChallengeSolvesRouteV2 } from '@rctf/types'
import { deleteAllSolves } from '../../../../services/challenges'
import {
  forceLeaderboardUpdate,
  requestChallengeRecompute,
} from '../../../../workers'
import adminGroup from '../group'

adminGroup.route(
  DeleteAllChallengeSolvesRouteV2,
  async ({ res, ctx, params }) => {
    const deletedSolves = await deleteAllSolves(ctx.var.db, params)

    for (const { challengeid: challengeId } of deletedSolves) {
      requestChallengeRecompute(ctx.var.redis, challengeId, 'delete')
    }

    if (deletedSolves.length > 0) {
      forceLeaderboardUpdate(ctx.var.redis)
    }

    return res.goodAllChallengeSolvesDeleteV2()
  }
)
