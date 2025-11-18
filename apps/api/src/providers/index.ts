import { config } from '@rctf/config'
import type { ProviderConfig } from '@rctf/config'
import { emailProviders } from './emails'
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
      `Unsupported email provider: ${
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
