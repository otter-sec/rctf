import { config } from '@rctf/config'
import type { DatabaseClient, User } from '@rctf/db'
import type {
  BadAvatarFile,
  BadAvatarFileSize,
  BadModerationNotPassed,
  FileField,
  ResponseHelpers,
} from '@rctf/types'
import type { PinoLogger } from 'hono-pino'
import sharp from 'sharp'
import type { TypedRedis } from '../cache/scripts'
import { avatarModerationProvider, uploadProvider } from '../providers'
import { updateUserAvatar } from './users'

export type SetUserAvatarError =
  'badAvatarFile' | 'badAvatarFileSize' | 'badModerationNotPassed'

export type SetUserAvatarResult =
  | { success: true; url: string | null }
  | { success: false; error: SetUserAvatarError }

type SetUserAvatarErrorResponseHelpers = ResponseHelpers<
  [
    typeof BadAvatarFile,
    typeof BadAvatarFileSize,
    typeof BadModerationNotPassed,
  ]
>

type SetUserAvatarErrorResponse = ReturnType<
  SetUserAvatarErrorResponseHelpers[keyof SetUserAvatarErrorResponseHelpers]
>

export const setUserAvatarErrorResponse = (
  res: SetUserAvatarErrorResponseHelpers,
  error: SetUserAvatarError
): SetUserAvatarErrorResponse => {
  if (error === 'badAvatarFileSize') {
    return res.badAvatarFileSize({ maxSize: config.maxAvatarSize })
  }
  if (error === 'badAvatarFile') {
    return res.badAvatarFile()
  }
  return res.badModerationNotPassed()
}

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

export const setUserAvatar = async (
  log: PinoLogger,
  db: DatabaseClient,
  redis: TypedRedis,
  user: Pick<User, 'id' | 'avatarUrl'>,
  avatar: FileField | undefined
): Promise<SetUserAvatarResult> => {
  let url: string | null = null
  if (avatar) {
    if (avatar.size > config.maxAvatarSize) {
      return { success: false, error: 'badAvatarFileSize' }
    }

    let file: Buffer
    try {
      file = await sharp(await avatar.arrayBuffer())
        .resize(256, 256)
        .webp()
        .toBuffer()
    } catch {
      return { success: false, error: 'badAvatarFile' }
    }

    if (!(await moderateWebp(log, file))) {
      return { success: false, error: 'badModerationNotPassed' }
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

  await updateUserAvatar(db, redis, user.id, url)
  return { success: true, url }
}
