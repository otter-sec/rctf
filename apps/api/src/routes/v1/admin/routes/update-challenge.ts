import { UpdateChallengeRoute } from '@rctf/types'
import {
  getPrivateChallenge,
  upsertChallenge,
} from '../../../../services/challenges'
import {
  applyChallengeConfigChange,
  scoringConfigChanged,
} from '../../../../services/solve-points'
import { forceLeaderboardUpdate } from '../../../../workers'
import adminGroup from '../group'

adminGroup.route(UpdateChallengeRoute, async ({ res, ctx, params, body }) => {
  const before = await getPrivateChallenge(ctx.var.db, params.id)
  const updated = await upsertChallenge(ctx.var.db, params.id, {
    ...body.data,
    files: body.data.files?.map(file => ({
      ...file,
      size: -1,
    })),
  })
  if (before && scoringConfigChanged(before.data, updated.data)) {
    await applyChallengeConfigChange(
      ctx.var.db,
      ctx.var.redis,
      ctx.var.logger,
      params.id
    )
  }
  forceLeaderboardUpdate(ctx.var.redis)
  return res.goodChallengeUpdate({
    id: updated.id,
    ...updated.data,
    sortWeight: updated.data.sortWeight ?? null,
  })
})
