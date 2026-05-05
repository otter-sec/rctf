import { UpdateAdminUserRouteV2 } from '@rctf/types'
import { updateAdminUser } from '../../../../services/users'
import adminGroup from '../group'

adminGroup.route(UpdateAdminUserRouteV2, async ({ res, ctx, params, body }) => {
  const result = await updateAdminUser(
    ctx.var.db,
    ctx.var.redis,
    params.id,
    body.data
  )

  if (!result.success) {
    if (result.error === 'badUserPrivileged') {
      return res.badUserPrivileged()
    }
    return res.badUnknownUser()
  }

  return res.goodAdminUserUpdate()
})
