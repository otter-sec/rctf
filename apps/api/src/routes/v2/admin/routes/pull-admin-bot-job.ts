import { PullAdminBotJobRouteV2 } from '@rctf/types'
import { pullNextJob } from '../../../../services/admin-bot-jobs'
import adminGroup from '../group'

adminGroup.route(PullAdminBotJobRouteV2, async ({ ctx, res }) => {
  const pulled = await pullNextJob(ctx.var.db)
  if (!pulled) {
    return res.goodAdminBotJobPull({ job: null })
  }

  return res.goodAdminBotJobPull({
    job: {
      id: pulled.id,
      challengeId: pulled.challenge_id,
      configRevision: pulled.config_revision,
      userId: pulled.user_id,
      submittedAt: pulled.created_at,
      flag: pulled.flag,
      inputs: pulled.inputs,
      remotes: pulled.remotes ?? [],
      instancerInstances: pulled.instancer_instances,
    },
  })
})
