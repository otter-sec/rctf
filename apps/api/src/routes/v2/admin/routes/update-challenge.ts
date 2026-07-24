import type { AdminBotConfig } from '@rctf/db'
import { UpdateChallengeRouteV2 } from '@rctf/types'
import { adminBotProvider, instancerEnabled } from '../../../../providers'
import { getFlagProvider } from '../../../../providers/flags'
import {
  ChallengeKindChangeBlockedError,
  getPrivateChallenge,
  upsertChallenge,
} from '../../../../services/challenges'
import {
  getInstancerProvider,
  resolveInstancerName,
} from '../../../../services/instancer'
import {
  applyChallengeConfigChange,
  scoringConfigChanged,
} from '../../../../services/solve-points'
import { formatZodIssues } from '../../../../util/zod'
import { forceLeaderboardUpdate } from '../../../../workers'
import adminGroup from '../group'

const sha256Hex = (data: string): string => {
  const hash = new Bun.CryptoHasher('sha256')
  hash.update(data)
  return hash.digest('hex')
}

adminGroup.route(UpdateChallengeRouteV2, async ({ res, ctx, params, body }) => {
  const before = await getPrivateChallenge(ctx.var.db, params.id)

  // Validate flag entries against their provider config schemas if provided
  if (body.data.flags) {
    for (const [i, entry] of body.data.flags.entries()) {
      const provider = getFlagProvider(entry.provider)
      if (!provider) {
        return res.badBody({
          reason: `flags[${i}]: unknown flag provider ${entry.provider}`,
        })
      }

      const configResult = provider.configSchema.safeParse(entry.config)
      if (!configResult.success) {
        return res.badBody({
          reason: `flags[${i}]: ${formatZodIssues(configResult.error)}`,
        })
      }

      entry.config = configResult.data
    }
  }

  // Validate instancer config if provided
  if (body.data.instancerConfig) {
    if (!instancerEnabled) {
      return res.badInstancerConfig({
        error: 'Instancer is not enabled',
      })
    }

    const name = resolveInstancerName(
      body.data.instancerConfig,
      before?.data.instancerConfig
    )
    const provider = getInstancerProvider(name)
    if (!provider) {
      return res.badInstancerConfig({
        error: `Unknown instancer: ${name ?? '(none)'}`,
      })
    }

    const configResult = provider.configSchema.safeParse(
      body.data.instancerConfig.config
    )

    if (!configResult.success) {
      return res.badInstancerConfig({
        error: formatZodIssues(configResult.error),
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

  let updated
  try {
    updated = await upsertChallenge(ctx.var.db, params.id, {
      ...body.data,
      adminBotConfig: resolvedAdminBotConfig,
      files: body.data.files?.map(file => ({
        ...file,
        size: file.size ?? undefined,
      })),
    })
  } catch (err) {
    if (err instanceof ChallengeKindChangeBlockedError) {
      return res.badBody({
        reason: `scoring:kind:${err.fromKind}->${err.toKind} blocked: ${err.solveCount} solves exist`,
      })
    }
    throw err
  }

  if (before && scoringConfigChanged(before.data, updated.data)) {
    await applyChallengeConfigChange(
      ctx.var.db,
      ctx.var.redis,
      ctx.var.logger,
      params.id
    )
  }

  forceLeaderboardUpdate(ctx.var.redis)
  return res.goodChallengeUpdateV2({
    id: updated.id,
    ...updated.data,
    files: updated.data.files.map(file => ({
      ...file,
      size: file.size ?? null,
    })),
    hidden: updated.data.hidden ?? false,
  })
})
