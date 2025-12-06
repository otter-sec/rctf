import { config } from '@rctf/config'
import type { ProtectedAction } from '@rctf/types'
import { captchaProvider } from '../providers'

export const isActionProtected = (action: ProtectedAction): boolean => {
  return config.captcha?.protectedEndpoints?.includes(action) ?? false
}

export const validateCaptcha = async (
  action: ProtectedAction,
  code: string | undefined,
  ip: string | undefined
): Promise<boolean> => {
  if (!isActionProtected(action)) {
    return true
  }

  if (!captchaProvider || !code) {
    return false
  }

  return captchaProvider.validate({ code, ip: ip ?? '' })
}
