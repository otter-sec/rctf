import { config } from '@rctf/config'
import { instancerProviders } from '../instancer'
import type { InstancerProvider } from '../instancer/base'
import { resolveInstancerConfigs } from '../instancer/resolve'
import { loadProvider } from './load'

const resolvedInstancers = resolveInstancerConfigs(config)
export const instancers: Record<string, InstancerProvider> = Object.fromEntries(
  Object.entries(resolvedInstancers.configs).map(([name, providerConfig]) => [
    name,
    loadProvider(instancerProviders, providerConfig)!,
  ])
)
export const defaultInstancerName = resolvedInstancers.defaultName
export const instancerEnabled = Object.keys(instancers).length > 0
