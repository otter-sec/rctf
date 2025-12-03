import { UpdateChallengeRouteV2 } from '@rctf/types'
import { upsertChallenge } from '../../../../services/challenges'
import { forceLeaderboardUpdate } from '../../../../workers'
import adminGroup from '../group'

adminGroup.route(UpdateChallengeRouteV2, async ({ res, ctx, params, body }) => {
  const updated = await upsertChallenge(ctx.var.db, params.id, body.data)
  forceLeaderboardUpdate()
  return res.goodChallengeUpdate({
    id: updated.id,
    ...updated.data,
    sortWeight: updated.data.sortWeight ?? null,
  })
})
