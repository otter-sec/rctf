import type { AnalyticsProvider } from './base'
import CloudflareAnalyticsProvider from './cloudflare'
import GoogleAnalyticsProvider from './google'
import PlausibleAnalyticsProvider from './plausible'

type AnalyticsProviderConstructor = (options: any) => AnalyticsProvider
export const analyticsProviders: Record<string, AnalyticsProviderConstructor> =
  {
    'analytics/google': (options: any) => new GoogleAnalyticsProvider(options),
    'analytics/cloudflare': (options: any) =>
      new CloudflareAnalyticsProvider(options),
    'analytics/plausible': (options: any) =>
      new PlausibleAnalyticsProvider(options),
  }
