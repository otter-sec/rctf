import type { CaptchaProvider } from './base'
import HCaptchaProvider from './hcaptcha'
import RecaptchaProvider from './recaptcha'

type CaptchaProviderConstructor = (options: any) => CaptchaProvider
export const captchaProviders: Record<string, CaptchaProviderConstructor> = {
  'captcha/hcaptcha': (options: any) => new HCaptchaProvider(options),
  'captcha/recaptcha': (options: any) => new RecaptchaProvider(options),
  // TODO(es3n1n): add turnstile
}
