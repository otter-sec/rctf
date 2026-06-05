import { GetAdminUserRouteV2 } from '@rctf/types'
import { getAdminUserWithSolves } from '../../../../services/users'
import adminGroup from '../group'

adminGroup.route(GetAdminUserRouteV2, async ({ res, ctx, params }) => {
  const user = await getAdminUserWithSolves(ctx.var.db, params.id)
  if (!user) {
    return res.badUnknownUser()
  }

  return res.goodAdminUserV2(user)
})
