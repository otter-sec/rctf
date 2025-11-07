import type { ServerConfig } from '@rctf/types'
import deepMerge from 'deepmerge'
import { defaultConfig, loadEnvConfig, loadFileConfigs } from './loader'

export const config: ServerConfig = deepMerge.all([
  defaultConfig,
  ...loadFileConfigs(),
  loadEnvConfig(),
]) as ServerConfig
