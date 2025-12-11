import { config } from '@rctf/config'
import type { ProviderConfig } from '@rctf/config'
import { captchaProviders } from './captcha'
import { emailProviders } from './emails'
import { instancerProviders } from './instancer'
import { scoreProviders } from './scores'
import { uploadProviders } from './uploads'
import { messagesProviders } from './messages'

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
  // NOTE(es3n1n): backporting v1 recaptcha config
  if (config.recaptcha) {
    if (config.captcha) {
      throw new Error(
        'Captcha provider and recaptcha config cannot be used together'
      )
    }

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

  return loadProvider(captchaProviders, config.captcha?.provider)
})()

export const bloodbotProviders = config.bloodbot?.destinations.map(
  ({ provider }) => loadProvider(messagesProviders, provider)!
)
