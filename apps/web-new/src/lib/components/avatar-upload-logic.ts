/** Pure client-side validation for the avatar upload, mirroring the old component. */

export const MAX_AVATAR_SIZE = 1024 * 1024

export type AvatarValidation = { ok: true } | { ok: false; message: string }

/**
 * Reject files over 1 MB or non-image types, matching the old order (size
 * before type). The 1 MB boundary is inclusive: a file of exactly
 * `MAX_AVATAR_SIZE` bytes is accepted.
 */
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
