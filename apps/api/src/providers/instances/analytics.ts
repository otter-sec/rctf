import { config } from '@rctf/config'
import { analyticsProviders } from '../analytics'
import { loadProvider } from './load'

export const analyticsProvider = loadProvider(
  analyticsProviders,
  config.analytics?.provider
)
