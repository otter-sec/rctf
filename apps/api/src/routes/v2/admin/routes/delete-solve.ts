import { DeleteChallengeSolveRouteV2 } from '@rctf/types'
import { deleteSolve } from '../../../../services/challenges'
import {
  forceLeaderboardUpdate,
  requestChallengeRecompute,
} from '../../../../workers'
import adminGroup from '../group'

adminGroup.route(DeleteChallengeSolveRouteV2, async ({ res, ctx, params }) => {
  const deletedSolve = await deleteSolve(ctx.var.db, params)
  if (!deletedSolve.length) {
    // TODO(trixter-osec): It would be nice to know if it was specifically challenge id / user id missing?
    return res.badUnknownSolve()
  }

  requestChallengeRecompute(ctx.var.redis, params.challengeId)
  forceLeaderboardUpdate(ctx.var.redis)
  return res.goodChallengeSolveDelete()
})
