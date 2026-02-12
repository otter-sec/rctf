import { AdminBotJobStatus, GetAdminBotJobStatusRouteV2 } from '@rctf/types'
import { adminBotProvider } from '../../../../providers'
import { getLatestJob } from '../../../../services/admin-bot-jobs'
import { getChallenge } from '../../../../services/challenges'
import integrationsGroup from '../group'

integrationsGroup.route(
  GetAdminBotJobStatusRouteV2,
  async ({ ctx, res, params, user }) => {
    if (!adminBotProvider) {
      return res.badEndpoint()
    }

    const challenge = await getChallenge(ctx.var.db, params.id)
    if (!challenge) {
      return res.badChallenge()
    }

    const job = await getLatestJob(ctx.var.db, params.id, user.id)
    return res.goodAdminBotJobStatus({
      job: job
        ? {
            ...job,
            status: job.status as AdminBotJobStatus,
          }
        : null,
    })
  }
)
