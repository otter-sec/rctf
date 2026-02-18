import { FailAdminBotJobRouteV2 } from '@rctf/types'
import { failJob } from '../../../../services/admin-bot-jobs'
import adminGroup from '../group'

adminGroup.route(FailAdminBotJobRouteV2, async ({ ctx, res, params, body }) => {
  const job = await failJob(ctx.var.db, params.id, body.logs)
  if (!job) {
    return res.badEndpoint()
  }

  return res.goodAdminBotJobUpdate({ ok: true })
})
