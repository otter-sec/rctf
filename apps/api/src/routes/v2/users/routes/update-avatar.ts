import { config } from '@rctf/config'
import { UpdateAvatarRoute } from '@rctf/types'
import sharp from 'sharp'
import { avatarModerationProvider, uploadProvider } from '../../../../providers'
import { rateLimit } from '../../../../services/rate-limit'
import { updateUserAvatar } from '../../../../services/users'
import usersGroup from '../group'
import type { PinoLogger } from 'hono-pino'

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

usersGroup.route(UpdateAvatarRoute, async ({ ctx, user, body, res }) => {
  let url: string | null = null
  if (body.avatar) {
    if (body.avatar.size > config.maxAvatarSize) {
      return res.badAvatarFileSize({
        maxSize: config.maxAvatarSize,
      })
    }

    // burst 2, 1 per 1min
    const timeLeft = await rateLimit(
      ctx.var.redis,
      `rl:UPDATE_AVATAR:${user.id}`,
      2,
      120_000
    )
    if (timeLeft) {
      return res.badRateLimit({ timeLeft })
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
      user.id,
      'webp',
      user.avatarUrl ?? null
    )
  } else if (user.avatarUrl) {
    await uploadProvider.deleteAvatar(user.avatarUrl)
  }

  await updateUserAvatar(ctx.var.db, ctx.var.redis, user.id, url)
  return res.goodAvatarUpdated({
    url,
  })
})
