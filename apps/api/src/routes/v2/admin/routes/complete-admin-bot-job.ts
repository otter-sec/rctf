import { CompleteAdminBotJobRouteV2 } from '@rctf/types'
import { completeJob } from '../../../../services/admin-bot-jobs'
import adminGroup from '../group'

adminGroup.route(
  CompleteAdminBotJobRouteV2,
  async ({ ctx, res, params, body }) => {
    const job = await completeJob(ctx.var.db, params.id, body.logs)
    if (!job) {
      return res.badEndpoint()
    }

    return res.goodAdminBotJobUpdate({ ok: true })
  }
)
