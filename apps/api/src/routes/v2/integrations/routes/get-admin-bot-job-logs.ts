import { GetAdminBotJobLogsRouteV2 } from '@rctf/types'
import { adminBotProvider } from '../../../../providers'
import { getJobLogs } from '../../../../services/admin-bot-jobs'
import { getChallenge } from '../../../../services/challenges'
import integrationsGroup from '../group'

integrationsGroup.route(
  GetAdminBotJobLogsRouteV2,
  async ({ ctx, res, params, user }) => {
    if (!adminBotProvider) {
      return res.badEndpoint()
    }

    const challenge = await getChallenge(ctx.var.db, params.id)
    if (!challenge || !challenge.data.adminBotConfig) {
      return res.badChallenge()
    }

    const logs = await getJobLogs(ctx.var.db, params.jobId, user.id)
    return res.goodAdminBotJobLogs({ logs })
  }
)
