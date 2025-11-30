import { config } from '@rctf/config'
import { UpdateAvatarRoute } from '@rctf/types'
import sharp from 'sharp'
import { uploadProvider } from '../../../../providers'
import { updateUserAvatar } from '../../../../services/users'
import usersGroup from '../group'

usersGroup.route(UpdateAvatarRoute, async ({ ctx, user, body, res }) => {
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

    url = await uploadProvider.uploadAvatar(file, user.id, 'webp')
  }

  await updateUserAvatar(ctx.var.db, ctx.var.redis, user.id, url)
  return res.goodAvatarUpdated({
    url,
  })
})
