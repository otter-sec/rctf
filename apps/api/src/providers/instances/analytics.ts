import { config } from '@rctf/config'
import { analyticsProviders } from '../analytics'
import { loadProvider } from './load'

export const analyticsProvider = (() => {
  if (config.analytics?.provider) {
    return loadProvider(analyticsProviders, config.analytics.provider)
  }

  // NOTE(es3n1n): backporting v1 google analytics config
  if (config.globalSiteTag) {
    return loadProvider(analyticsProviders, {
      name: 'analytics/google',
      options: { siteTag: config.globalSiteTag },
    })
  }

  return undefined
})()
