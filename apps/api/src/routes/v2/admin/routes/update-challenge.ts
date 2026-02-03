import { UpdateChallengeRouteV2 } from '@rctf/types'
import { instancerProvider } from '../../../../providers'
import { upsertChallenge } from '../../../../services/challenges'
import { forceLeaderboardUpdate } from '../../../../workers'
import adminGroup from '../group'

adminGroup.route(UpdateChallengeRouteV2, async ({ res, ctx, params, body }) => {
  // Validate instancer config if provided
  if (body.data.instancerConfig) {
    if (!instancerProvider) {
      return res.badInstancerConfig({
        error: 'Instancer is not enabled',
      })
    }

    const configResult = instancerProvider.configSchema.safeParse(
      body.data.instancerConfig.config
    )

    if (!configResult.success) {
      return res.badInstancerConfig({
        error: configResult.error.issues
          .map(e => `${e.path.join('.')}: ${e.message}`)
          .join(', '),
      })
    }
  }

  const updated = await upsertChallenge(ctx.var.db, params.id, {
    ...body.data,
    files: body.data.files?.map(file => ({
      ...file,
      size: file.size ?? undefined,
    })),
  })

  forceLeaderboardUpdate()
  return res.goodChallengeUpdate({
    id: updated.id,
    ...updated.data,
    files: updated.data.files.map(file => ({
      ...file,
      size: file.size ?? null,
    })),
    hidden: updated.data.hidden ?? false,
  })
})
