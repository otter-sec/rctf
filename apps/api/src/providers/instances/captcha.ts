import { config } from '@rctf/config'
import { captchaProviders } from '../captcha'
import { loadProvider } from './load'

export const captchaProvider = (() => {
  if (config.captcha?.provider) {
    return loadProvider(captchaProviders, config.captcha.provider)
  }

  // NOTE(es3n1n): backporting v1 google captcha config
  if (config.recaptcha) {
    const provider = {
      name: 'captcha/recaptcha' as const,
      options: {
        secretKey: config.recaptcha.secretKey,
        siteKey: config.recaptcha.siteKey,
      },
    }
    config.captcha = {
      provider,
      protectedEndpoints: config.recaptcha.protectedActions ?? [],
    }

    return loadProvider(captchaProviders, provider)
  }

  return undefined
})()
