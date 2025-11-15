import { UpdateChallengeRoute } from '@rctf/types'
import { upsertChallenge } from '../../../../services/challenges'
import adminGroup from '../group'

adminGroup.route(UpdateChallengeRoute, async ({ res, ctx, params, body }) => {
  const updated = await upsertChallenge(ctx.var.db, params.id, body.data)
  return res.goodChallengeUpdate({
    id: updated.id,
    ...updated.data,
  })
})
