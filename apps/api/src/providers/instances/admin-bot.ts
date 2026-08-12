import { config } from '@rctf/config'
import { adminBotProviders } from '../admin-bot'
import { loadProvider } from './load'

export const adminBotProvider = loadProvider(
  adminBotProviders,
  config.adminBot?.provider
)
export const adminBotEnabled = adminBotProvider !== undefined
