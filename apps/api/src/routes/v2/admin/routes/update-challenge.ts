import { UpdateChallengeRouteV2 } from '@rctf/types'
import { upsertChallenge } from '../../../../services/challenges'
import { forceLeaderboardUpdate } from '../../../../workers'
import adminGroup from '../group'

adminGroup.route(UpdateChallengeRouteV2, async ({ res, ctx, params, body }) => {
  const updated = await upsertChallenge(ctx.var.db, params.id, {
    ...body.data,
    files: body.data.files?.map(file => ({
      name: file.name,
      url: file.url,
      size: file.size ?? undefined,
    })),
    instancerConfig: body.data.instancerConfig ?? undefined,
  })

  forceLeaderboardUpdate()
  return res.goodChallengeUpdate({
    id: updated.id,
    ...updated.data,
    files: updated.data.files.map(file => ({
      name: file.name,
      url: file.url,
      size: file.size ?? null,
    })),
    sortWeight: updated.data.sortWeight ?? null,
    instancerConfig: updated.data.instancerConfig ?? null,
  })
})
