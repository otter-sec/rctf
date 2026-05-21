import { DeleteChallengeRoute } from '@rctf/types'
import { deleteChallenge } from '../../../../services/challenges'
import { forceLeaderboardUpdate } from '../../../../workers'
import adminGroup from '../group'

adminGroup.route(DeleteChallengeRoute, async ({ res, ctx, params }) => {
  await deleteChallenge(ctx.var.db, params.id)
  forceLeaderboardUpdate(ctx.var.redis)
  return res.goodChallengeDelete()
})
