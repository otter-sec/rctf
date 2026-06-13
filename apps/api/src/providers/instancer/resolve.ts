import type { ProviderConfig } from '@rctf/config'

export interface ResolvedInstancerConfigs {
  configs: Record<string, ProviderConfig>
  defaultName?: string
}

interface InstancerConfigSlice {
  instancers?: Record<string, ProviderConfig>
  defaultInstancer?: string
}

export const resolveInstancerConfigs = (
  cfg: InstancerConfigSlice
): ResolvedInstancerConfigs => {
  const configs = cfg.instancers ?? {}
  const names = Object.keys(configs)

  if (names.length === 0) {
    return { configs: {} }
  }

  let defaultName = cfg.defaultInstancer
  if (
    defaultName !== undefined &&
    !Object.prototype.hasOwnProperty.call(configs, defaultName)
  ) {
    throw new Error(
      `defaultInstancer "${defaultName}" is not defined in instancers (available: ${names.join(
        ', '
      )})`
    )
  }

  if (defaultName === undefined) {
    if (names.length > 1) {
      throw new Error(
        `Multiple instancers are defined (${names.join(
          ', '
        )}) but defaultInstancer is not set`
      )
    }
    defaultName = names[0]
  }

  return { configs, defaultName }
}
