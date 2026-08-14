import type { ServerConfig } from './types'

// backporting v1 configs
export const normalizeConfig = (config: ServerConfig): ServerConfig => {
  if (!config.captcha?.provider && config.recaptcha) {
    config.captcha = {
      provider: {
        name: 'captcha/recaptcha',
        options: {
          secretKey: config.recaptcha.secretKey,
          siteKey: config.recaptcha.siteKey,
        },
      },
      protectedEndpoints: config.recaptcha.protectedActions ?? [],
    }
  }

  if (!config.analytics?.provider && config.globalSiteTag) {
    config.analytics = {
      provider: {
        name: 'analytics/google',
        options: { siteTag: config.globalSiteTag },
      },
    }
  }

  return config
}
