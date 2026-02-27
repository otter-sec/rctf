import type { AdminBotConfig } from '@rctf/db'
import { UpdateChallengeRouteV2 } from '@rctf/types'
import { adminBotProvider, instancerProvider } from '../../../../providers'
import { upsertChallenge } from '../../../../services/challenges'
import { forceLeaderboardUpdate } from '../../../../workers'
import adminGroup from '../group'

const sha256Hex = (data: string): string => {
  const hash = new Bun.CryptoHasher('sha256')
  hash.update(data)
  return hash.digest('hex')
}

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

    body.data.instancerConfig.config = configResult.data
  }

  let resolvedAdminBotConfig: AdminBotConfig | null | undefined
  if (body.data.adminBotConfig) {
    if (!adminBotProvider) {
      return res.badAdminBotConfig({
        error: 'Admin bot is not enabled',
      })
    }

    const result = await adminBotProvider.loadConfig(
      body.data.adminBotConfig.code
    )
    if (typeof result === 'string') {
      return res.badAdminBotConfig({ error: result })
    }

    resolvedAdminBotConfig = {
      code: body.data.adminBotConfig.code,
      inputs: result.inputs,
      revision: sha256Hex(body.data.adminBotConfig.code),
      timeoutMilliseconds: result.timeoutMilliseconds,
      requireInstancerInstancesRunning: result.requireInstancerInstancesRunning,
    }
  } else if (body.data.adminBotConfig === null) {
    resolvedAdminBotConfig = null
  }

  const updated = await upsertChallenge(ctx.var.db, params.id, {
    ...body.data,
    adminBotConfig: resolvedAdminBotConfig,
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
