import type { InstancerInstance } from '@rctf/db'
import {
  InstanceStatus,
  SubmissionLogKind,
  SubmissionLogResult,
  SubmitAdminBotJobRouteV2,
} from '@rctf/types'
import { adminBotProvider, instancerProvider } from '../../../../providers'
import { createJob, hasActiveJob } from '../../../../services/admin-bot-jobs'
import { getChallenge } from '../../../../services/challenges'
import { rateLimitAdminBot } from '../../../../services/rate-limit'
import { createSubmissionLog } from '../../../../services/submission-logs'
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

    const adminBotDetails = (extra: Record<string, unknown> = {}) => ({
      inputs: body.inputs,
      configRevision: adminBotConfig.revision,
      ...extra,
    })

    const logSubmission = (
      result: SubmissionLogResult,
      details?: Record<string, unknown>
    ) =>
      createSubmissionLog(ctx.var.db, {
        kind: SubmissionLogKind.ADMIN_BOT,
        challengeId: params.id,
        userId: user.id,
        ip: ctx.var.ip,
        result,
        details: details ?? adminBotDetails(),
      })

    for (const [name, rule] of Object.entries(adminBotConfig.inputs)) {
      const value = body.inputs[name]
      if (value === undefined) {
        await logSubmission(
          SubmissionLogResult.INVALID_INPUT,
          adminBotDetails({
            field: name,
            error: `Missing required input: ${name}`,
          })
        )
        return res.badAdminBotConfig({
          error: `Missing required input: ${name}`,
        })
      }

      try {
        const regex = new RegExp(rule.pattern, rule.flags)
        if (!regex.test(value)) {
          await logSubmission(
            SubmissionLogResult.INVALID_INPUT,
            adminBotDetails({
              field: name,
              error: `Input "${name}" does not match the required format`,
            })
          )
          return res.badAdminBotConfig({
            error: `Input "${name}" does not match the required format`,
          })
        }
      } catch {
        await logSubmission(
          SubmissionLogResult.INVALID_INPUT,
          adminBotDetails({
            field: name,
            error: `Regex for input "${name}" is not valid, contact challenge author`,
          })
        )
        return res.badAdminBotConfig({
          error: `Regex for input "${name}" is not valid, contact challenge author`,
        })
      }
    }

    if (await hasActiveJob(ctx.var.db, params.id, user.id)) {
      await logSubmission(SubmissionLogResult.ACTIVE_JOB)
      return res.badAdminBotConfig({
        error: 'You already have an active admin bot job for this challenge',
      })
    }

    const timeLeft = await rateLimitAdminBot(ctx.var.redis, user.id, params.id)
    if (timeLeft) {
      await logSubmission(SubmissionLogResult.RATE_LIMITED)
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
        await logSubmission(
          SubmissionLogResult.BAD_INSTANCER_STATE,
          adminBotDetails({
            error: 'Admin bot requires a running challenge instance',
            instancerStatus: instanceStatus.kind,
            status:
              instanceStatus.kind === 'instancerInstanceDetails'
                ? instanceStatus.status
                : null,
          })
        )
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
        await logSubmission(
          SubmissionLogResult.BAD_INSTANCER_STATE,
          adminBotDetails({
            error: 'Instance will expire before admin bot timeout',
            timeLeftMilliseconds: instanceStatus.timeLeftMilliseconds ?? null,
          })
        )
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
      submissionIp: ctx.var.ip,
    })
    if (!job) {
      await logSubmission(SubmissionLogResult.ACTIVE_JOB)
      return res.badAdminBotConfig({
        error: 'You already have an active admin bot job for this challenge',
      })
    }
    return res.goodAdminBotJobSubmitted({ jobId: job.id })
  }
)
