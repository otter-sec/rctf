import { config } from '@rctf/config'
import { UpdateAvatarRoute } from '@rctf/types'
import {
  setUserAvatar,
  setUserAvatarErrorResponse,
} from '../../../../services/avatar'
import { rateLimitUpdateAvatar } from '../../../../services/rate-limit'
import usersGroup from '../group'

usersGroup.route(UpdateAvatarRoute, async ({ ctx, user, body, res }) => {
  if (body.avatar) {
    if (body.avatar.size > config.maxAvatarSize) {
      return res.badAvatarFileSize({ maxSize: config.maxAvatarSize })
    }

    const timeLeft = await rateLimitUpdateAvatar(ctx.var.redis, user.id)
    if (timeLeft) {
      return res.badRateLimit({ timeLeft })
    }
  }

  const result = await setUserAvatar(
    ctx.var.logger,
    ctx.var.db,
    ctx.var.redis,
    user,
    body.avatar
  )

  if (!result.success) {
    return setUserAvatarErrorResponse(res, result.error)
  }

  return res.goodAvatarUpdated({ url: result.url })
})
