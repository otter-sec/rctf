import { DeleteAdminUserRouteV2 } from '@rctf/types'
import { deleteAdminUser } from '../../../../services/users'
import adminGroup from '../group'

adminGroup.route(DeleteAdminUserRouteV2, async ({ res, ctx, params }) => {
  const result = await deleteAdminUser(ctx.var.db, ctx.var.redis, params.id)

  if (!result.success) {
    if (result.error === 'badUserPrivileged') {
      return res.badUserPrivileged()
    }
    return res.badUnknownUser()
  }

  return res.goodAdminUserDelete()
})
