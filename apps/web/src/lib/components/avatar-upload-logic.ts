export const MAX_AVATAR_SIZE = 1024 * 1024

export type AvatarValidation = { ok: true } | { ok: false; message: string }

export function validateAvatarFile(file: File): AvatarValidation {
  if (file.size > MAX_AVATAR_SIZE) {
    const megabytes = (MAX_AVATAR_SIZE / 1024 / 1024).toFixed(0)
    return {
      ok: false,
      message: `File too large. Maximum size is ${megabytes}MB`,
    }
  }
  if (!file.type.startsWith('image/')) {
    return { ok: false, message: 'Please select an image file' }
  }
  return { ok: true }
}
