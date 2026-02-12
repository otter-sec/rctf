import { FailAdminBotJobRouteV2 } from '@rctf/types'
import { failJob, upsertJobLogs } from '../../../../services/admin-bot-jobs'
import adminGroup from '../group'

adminGroup.route(FailAdminBotJobRouteV2, async ({ ctx, res, params, body }) => {
  const job = await failJob(ctx.var.db, params.id)
  if (!job) {
    return res.badEndpoint()
  }

  if (body.logs) {
    await upsertJobLogs(ctx.var.db, {
      challengeId: job.challengeId,
      userId: job.userId,
      jobId: job.id,
      logs: body.logs,
    })
  }

  return res.goodAdminBotJobUpdate({ ok: true })
})
