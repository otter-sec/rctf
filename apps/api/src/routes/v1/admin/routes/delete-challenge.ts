import { DeleteChallengeRoute } from '@rctf/types'
import { deleteChallenge } from '../../../../services/challenges'
import {
  forceLeaderboardUpdate,
  requestAllChallengesRecompute,
} from '../../../../workers'
import adminGroup from '../group'

adminGroup.route(DeleteChallengeRoute, async ({ res, ctx, params }) => {
  await deleteChallenge(ctx.var.db, params.id)
  requestAllChallengesRecompute(ctx.var.redis, 'delete')
  forceLeaderboardUpdate(ctx.var.redis)
  return res.goodChallengeDelete()
})
