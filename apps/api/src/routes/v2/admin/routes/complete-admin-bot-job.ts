import { CompleteAdminBotJobRouteV2 } from '@rctf/types'
import { completeJob, saveJobLogs } from '../../../../services/admin-bot-jobs'
import adminGroup from '../group'

adminGroup.route(
  CompleteAdminBotJobRouteV2,
  async ({ ctx, res, params, body }) => {
    const job = await completeJob(ctx.var.db, params.id)
    if (!job) {
      return res.badEndpoint()
    }

    if (body.logs) {
      await saveJobLogs(ctx.var.db, {
        challengeId: job.challengeId,
        userId: job.userId,
        jobId: job.id,
        logs: body.logs,
      })
    }

    return res.goodAdminBotJobUpdate({ ok: true })
  }
)
