import deepMerge from 'deepmerge'
import { loadEnvConfig, loadFileConfigs } from './loader'
import { normalizeConfig } from './normalize'
import { ServerConfigSchema } from './types'

export * from './env'
export * from './normalize'
export * from './types'

export const config = normalizeConfig(
  ServerConfigSchema.parse(
    deepMerge.all([...loadFileConfigs(), loadEnvConfig()])
  )
)
