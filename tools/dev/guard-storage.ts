import { config } from '../../packages/config/src/index'
import { assertDevStorageTarget } from './assert-storage'

assertDevStorageTarget(config.database)
console.log('Dev storage target verified.')
