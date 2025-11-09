import deepMerge from 'deepmerge'
import { defaultConfig, loadEnvConfig, loadFileConfigs } from './loader'
import type { ServerConfig } from './types'

export * from './types'
export const config: ServerConfig = deepMerge.all([
  defaultConfig,
  ...loadFileConfigs(),
  loadEnvConfig(),
]) as ServerConfig
