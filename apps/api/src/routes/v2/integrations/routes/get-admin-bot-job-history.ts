import { AdminBotJobStatus, GetAdminBotJobHistoryRouteV2 } from '@rctf/types'
import { adminBotProvider } from '../../../../providers'
import { getJobHistory } from '../../../../services/admin-bot-jobs'
import { getChallenge } from '../../../../services/challenges'
import integrationsGroup from '../group'

integrationsGroup.route(
  GetAdminBotJobHistoryRouteV2,
  async ({ ctx, res, params, user }) => {
    if (!adminBotProvider) {
      return res.badEndpoint()
    }

    const challenge = await getChallenge(ctx.var.db, params.id)
    if (!challenge || !challenge.data.adminBotConfig) {
      return res.badChallenge()
    }

    const jobs = await getJobHistory(ctx.var.db, params.id, user.id)
    return res.goodAdminBotJobHistory({
      jobs: jobs.map(job => ({
        ...job,
        status: job.status as AdminBotJobStatus,
      })),
    })
  }
)
