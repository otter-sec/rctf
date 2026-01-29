import { mock } from 'bun:test'
import path from 'path'
import deepMerge from 'deepmerge'

const mockTestConfigDir = path.resolve(import.meta.dir, 'data/rctf.d')
process.env.LOG_LEVEL = 'silent'

mock.module('@rctf/config', () => {
  const {
    loadFileConfigs,
    loadEnvConfig,
  } = require('../../packages/config/src/loader')
  const { ServerConfigSchema } = require('../../packages/config/src/types')
  const realConfig = ServerConfigSchema.parse(
    deepMerge.all([...loadFileConfigs(), loadEnvConfig()])
  )

  const extractedHostCfg = {
    database: realConfig.database,
    tokenKey: realConfig.tokenKey,
  }

  const config = ServerConfigSchema.parse(
    deepMerge.all([extractedHostCfg, ...loadFileConfigs(mockTestConfigDir)])
  )
  return { config }
})
