import { FilterAdminUsersRouteV2, GetAdminUsersRouteV2 } from '@rctf/types'
import { getAllUsersWithScores } from '../../../../services/users'
import adminGroup from '../group'

adminGroup.route(GetAdminUsersRouteV2, async ({ ctx, res, query }) => {
  return res.goodAdminUsersV2(await getAllUsersWithScores(ctx.var.db, query))
})

adminGroup.route(FilterAdminUsersRouteV2, async ({ ctx, res, query, body }) => {
  return res.goodAdminUsersV2(
    await getAllUsersWithScores(ctx.var.db, {
      ...query,
      ...body,
    })
  )
})
