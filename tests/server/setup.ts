import path from 'path'
import { mock } from 'bun:test'
import deepMerge from 'deepmerge'

const mockTestConfigDir = path.resolve(import.meta.dir, 'data/rctf.d')
process.env.LOG_LEVEL = 'silent'

mock.module('@rctf/config', () => {
  const {
    defaultConfig,
    loadFileConfigs,
    loadEnvConfig,
  } = require('../../packages/config/src/loader')
  const realConfig: {
    database: any
    tokenKey: any
  } = deepMerge.all([
    defaultConfig,
    ...loadFileConfigs(),
    loadEnvConfig(),
  ]) as any

  const extractedHostCfg = {
    database: realConfig.database,
    tokenKey: realConfig.tokenKey,
  }

  const config = deepMerge.all([
    defaultConfig,
    extractedHostCfg,
    ...loadFileConfigs(mockTestConfigDir),
  ])
  return { config }
})
