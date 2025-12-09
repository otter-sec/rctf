import { UpdateChallengeRoute } from '@rctf/types'
import { upsertChallenge } from '../../../../services/challenges'
import { forceLeaderboardUpdate } from '../../../../workers'
import adminGroup from '../group'

adminGroup.route(UpdateChallengeRoute, async ({ res, ctx, params, body }) => {
  const updated = await upsertChallenge(ctx.var.db, params.id, {
    ...body.data,
    files: body.data.files?.map(file => ({
      ...file,
      size: -1,
    })),
  })
  forceLeaderboardUpdate()
  return res.goodChallengeUpdate({
    id: updated.id,
    ...updated.data,
    sortWeight: updated.data.sortWeight ?? null,
  })
})
