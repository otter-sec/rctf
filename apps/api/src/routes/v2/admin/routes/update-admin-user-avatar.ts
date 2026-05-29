import { UpdateAdminUserAvatarRouteV2 } from '@rctf/types'
import {
  setUserAvatar,
  setUserAvatarErrorResponse,
} from '../../../../services/avatar'
import { getUser } from '../../../../services/users'
import adminGroup from '../group'

adminGroup.route(
  UpdateAdminUserAvatarRouteV2,
  async ({ ctx, params, body, res }) => {
    const targetUser = await getUser(ctx.var.db, params.id)
    if (!targetUser) {
      return res.badUnknownUser()
    }

    if (targetUser.perms > 0) {
      return res.badUserPrivileged()
    }

    const result = await setUserAvatar(
      ctx.var.logger,
      ctx.var.db,
      ctx.var.redis,
      targetUser,
      body.avatar
    )

    if (!result.success) {
      return setUserAvatarErrorResponse(res, result.error)
    }

    return res.goodAvatarUpdated({ url: result.url })
  }
)
