import type { InstancerConfig } from '@rctf/db'
import { UpdateChallengeRouteV2 } from '@rctf/types'
import { upsertChallenge } from '../../../../services/challenges'
import { forceLeaderboardUpdate } from '../../../../workers'
import adminGroup from '../group'

adminGroup.route(UpdateChallengeRouteV2, async ({ res, ctx, params, body }) => {
  // NOTE(es3n1n): Cast is needed because z.any() makes `data` optional :shrug:
  const instancerConfig = body.data.instancerConfig as
    | Partial<InstancerConfig>
    | undefined

  const updated = await upsertChallenge(ctx.var.db, params.id, {
    ...body.data,
    files: body.data.files?.map(file => ({
      name: file.name,
      url: file.url,
      size: file.size ?? undefined,
    })),
    instancerConfig,
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
