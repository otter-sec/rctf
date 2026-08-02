import type { ProviderConfig } from '@rctf/config'

export const loadProvider = <Base>(
  providers: Record<string, (options: any) => Base>,
  providerConfig: ProviderConfig | undefined
): Base | undefined => {
  if (!providerConfig) {
    return undefined
  }

  const provider = providers[providerConfig.name]
  if (!provider) {
    throw new Error(
      `Unsupported provider: ${providerConfig.name}. Available: ${Object.keys(
        providers
      ).join(', ')}`
    )
  }

  return provider(providerConfig.options)
}
