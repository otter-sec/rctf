import { config } from '@rctf/config'
import { UpdateAdminUserAvatarRouteV2 } from '@rctf/types'
import type { PinoLogger } from 'hono-pino'
import sharp from 'sharp'
import { avatarModerationProvider, uploadProvider } from '../../../../providers'
import { getUser, updateUserAvatar } from '../../../../services/users'
import adminGroup from '../group'

const moderateWebp = async (
  log: PinoLogger,
  buffer: Buffer
): Promise<boolean> => {
  if (!avatarModerationProvider) {
    return true
  }

  try {
    return await avatarModerationProvider.checkWebpImage(buffer)
  } catch (e) {
    log.error(e, 'Failed to moderate avatar')
    return config.avatarsModeration?.allowOnInternalError ?? true
  }
}

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

    let url: string | null = null
    if (body.avatar) {
      if (body.avatar.size > config.maxAvatarSize) {
        return res.badAvatarFileSize({
          maxSize: config.maxAvatarSize,
        })
      }

      let file: Buffer
      try {
        file = await sharp(await body.avatar.arrayBuffer())
          .resize(256, 256)
          .webp()
          .toBuffer()
      } catch (e) {
        return res.badAvatarFile()
      }

      if (!(await moderateWebp(ctx.var.logger, file))) {
        return res.badModerationNotPassed()
      }

      url = await uploadProvider.uploadAvatar(
        file,
        targetUser.id,
        'webp',
        targetUser.avatarUrl ?? null
      )
    } else if (targetUser.avatarUrl) {
      await uploadProvider.deleteAvatar(targetUser.avatarUrl)
    }

    await updateUserAvatar(ctx.var.db, ctx.var.redis, targetUser.id, url)
    return res.goodAvatarUpdated({
      url,
    })
  }
)
