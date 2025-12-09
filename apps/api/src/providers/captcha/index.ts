import type { CaptchaProvider } from './base'
import HCaptchaProvider from './hcaptcha'
import RecaptchaProvider from './recaptcha'
import TurnstileProvider from './turnstile'

type CaptchaProviderConstructor = (options: any) => CaptchaProvider
export const captchaProviders: Record<string, CaptchaProviderConstructor> = {
  'captcha/hcaptcha': (options: any) => new HCaptchaProvider(options),
  'captcha/recaptcha': (options: any) => new RecaptchaProvider(options),
  'captcha/turnstile': (options: any) => new TurnstileProvider(options),
}
