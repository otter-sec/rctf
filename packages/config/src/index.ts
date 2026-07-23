import deepMerge from 'deepmerge'
import { loadEnvConfig, loadFileConfigs } from './loader'
import { ServerConfigSchema } from './types'

export * from './env'
export * from './types'
export const config = ServerConfigSchema.parse(
  deepMerge.all([...loadFileConfigs(), loadEnvConfig()])
)
