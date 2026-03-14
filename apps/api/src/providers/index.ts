import { config } from '@rctf/config'
import type { ProviderConfig } from '@rctf/config'
import { analyticsProviders } from './analytics'
import { captchaProviders } from './captcha'
import { emailProviders } from './emails'
import { instancerProviders } from './instancer'
import { scoreProviders } from './scores'
import { uploadProviders } from './uploads'
import { messagesProviders } from './messages'
import { moderationProviders } from './moderation'
import { adminBotProviders } from './admin-bot'

const loadProvider = <Base>(
  providers: Record<string, (options: any) => Base>,
  providerConfig: ProviderConfig | undefined
): Base | undefined => {
  if (!providerConfig) {
    return undefined
  }

  const provider = providers[providerConfig.name]
  if (!provider) {
    throw new Error(
      `Unsupported provider: ${
        providerConfig.name
      }. Available: ${Object.keys(providers).join(', ')}`
    )
  }

  return provider(providerConfig.options)
}

export const emailProvider = loadProvider(
  emailProviders,
  config.email?.provider
)

export const uploadProvider = loadProvider(
  uploadProviders,
  config.uploadProvider
)!

export const scoreProvider = loadProvider(scoreProviders, config.scoreProvider)!

export const instancerProvider = loadProvider(
  instancerProviders,
  config.instancerProvider
)

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

export const bloodBotProviders = config.bloodBot?.destinations.map(
  ({ provider }) => loadProvider(messagesProviders, provider)!
)

export const avatarModerationProvider = loadProvider(
  moderationProviders,
  config.avatarsModeration?.provider
)

export const adminBotProvider = loadProvider(
  adminBotProviders,
  config.adminBot?.provider
)

export const analyticsProvider = (() => {
  if (config.analytics?.provider) {
    return loadProvider(analyticsProviders, config.analytics.provider)
  }

  // NOTE(es3n1n): backporting v1 google analytics config
  if (config.globalSiteTag) {
    return loadProvider(analyticsProviders, {
      name: 'analytics/google',
      options: { siteTag: config.globalSiteTag },
    })
  }

  return undefined
})()
