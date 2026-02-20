import type { InstancerInstance } from '@rctf/db'
import { InstanceStatus, SubmitAdminBotJobRouteV2 } from '@rctf/types'
import { adminBotProvider, instancerProvider } from '../../../../providers'
import { createJob, hasActiveJob } from '../../../../services/admin-bot-jobs'
import { rateLimit } from '../../../../services/rate-limit'
import { getChallenge } from '../../../../services/challenges'
import { inferChallengeIntegrationId } from '../../../../util/instancer'
import integrationsGroup from '../group'

integrationsGroup.route(
  SubmitAdminBotJobRouteV2,
  async ({ ctx, res, params, body, user }) => {
    if (!adminBotProvider) {
      return res.badEndpoint()
    }

    const challenge = await getChallenge(ctx.var.db, params.id)
    if (!challenge) {
      return res.badChallenge()
    }

    const adminBotConfig = challenge.data.adminBotConfig
    if (!adminBotConfig) {
      return res.badAdminBotConfig({
        error: 'Admin bot is not configured for this challenge',
      })
    }

    for (const [name, rule] of Object.entries(adminBotConfig.inputs)) {
      const value = body.inputs[name]
      if (value === undefined) {
        return res.badAdminBotConfig({
          error: `Missing required input: ${name}`,
        })
      }

      try {
        const regex = new RegExp(rule.pattern, rule.flags)
        if (!regex.test(value)) {
          return res.badAdminBotConfig({
            error: `Input "${name}" does not match the required format`,
          })
        }
      } catch {
        return res.badAdminBotConfig({
          error: `Regex for input "${name}" is not valid, contact challenge author`,
        })
      }
    }

    if (await hasActiveJob(ctx.var.db, params.id, user.id)) {
      return res.badAdminBotConfig({
        error: 'You already have an active admin bot job for this challenge',
      })
    }

    // burst 1, 1 per 10s per user per challenge
    const timeLeft = await rateLimit(
      ctx.var.redis,
      `rl:ADMIN_BOT:${user.id}:${params.id}`,
      1,
      10_000
    )
    if (timeLeft) {
      return res.badRateLimit({ timeLeft })
    }

    let instancerInstances: InstancerInstance[] = []
    if (
      adminBotConfig.requireInstancerInstancesRunning &&
      instancerProvider &&
      challenge.data.instancerConfig
    ) {
      const instanceStatus = await instancerProvider.getInstance({
        teamId: user.id,
        challengeIntegrationId: inferChallengeIntegrationId(challenge),
      })

      if (
        instanceStatus.kind !== 'instancerInstanceDetails' ||
        instanceStatus.status !== InstanceStatus.RUNNING ||
        !instanceStatus.endpoints
      ) {
        return res.badInstancerState({
          error:
            'Adminbot for this challenge requires an active instance provisioned by the instancer',
        })
      }

      // We assume the adminbot will pick up this job immediately
      if (
        !instanceStatus.timeLeftMilliseconds ||
        instanceStatus.timeLeftMilliseconds < adminBotConfig.timeoutMilliseconds
      ) {
        return res.badInstancerState({
          error:
            'The instance will die midway through your submission, please extend it',
        })
      }

      instancerInstances = instanceStatus.endpoints.map(instance => {
        return {
          ...instance,
          type: instance.kind,
        }
      })
    }

    const job = await createJob(ctx.var.db, {
      challengeId: params.id,
      userId: user.id,
      configRevision: adminBotConfig.revision,
      flag: challenge.data.flag,
      inputs: Object.fromEntries(
        Object.keys(adminBotConfig.inputs).map(name => [
          name,
          body.inputs[name]!,
        ])
      ),
      instancerInstances,
      timeoutMs: adminBotConfig.timeoutMilliseconds,
    })
    if (!job) {
      return res.badAdminBotConfig({
        error: 'You already have an active admin bot job for this challenge',
      })
    }
    return res.goodAdminBotJobSubmitted({ jobId: job.id })
  }
)
