import { GetAdminBotQueueDepthRouteV2 } from '@rctf/types'
import { getQueueDepth } from '../../../../services/admin-bot-jobs'
import adminGroup from '../group'

adminGroup.route(GetAdminBotQueueDepthRouteV2, async ({ ctx, res }) => {
  const depth = await getQueueDepth(ctx.var.db)
  return res.goodAdminBotQueueDepth({ depth })
})
