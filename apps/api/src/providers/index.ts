import { config } from '@rctf/config'
import type { ProviderConfig } from '@rctf/config'
import { scoreProviders } from '@rctf/scoring'
import type { ScoreProvider } from '@rctf/scoring'
import { adminBotProviders } from './admin-bot'
import { analyticsProviders } from './analytics'
import { captchaProviders } from './captcha'
import { emailProviders } from './emails'
import { instancerProviders } from './instancer'
import type { InstancerProvider } from './instancer/base'
import { resolveInstancerConfigs } from './instancer/resolve'
import { messagesProviders } from './messages'
import { moderationProviders } from './moderation'
import { uploadProviders } from './uploads'

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

export const scoreProvider = loadProvider<ScoreProvider>(
  scoreProviders,
  config.scoreProvider
)!

const resolvedInstancers = resolveInstancerConfigs(config)
export const instancers: Record<string, InstancerProvider> = Object.fromEntries(
  Object.entries(resolvedInstancers.configs).map(([name, providerConfig]) => [
    name,
    loadProvider(instancerProviders, providerConfig)!,
  ])
)
export const defaultInstancerName = resolvedInstancers.defaultName
export const instancerEnabled = Object.keys(instancers).length > 0

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
export const adminBotEnabled = adminBotProvider !== undefined

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
