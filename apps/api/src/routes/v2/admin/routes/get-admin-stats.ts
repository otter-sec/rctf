import { GetAdminStatsRouteV2 } from '@rctf/types'
import { getAdminStats } from '../../../../services/admin-stats'
import adminGroup from '../group'

adminGroup.route(GetAdminStatsRouteV2, async ({ res, ctx }) => {
  return res.goodAdminStats(await getAdminStats(ctx.var.db))
})
