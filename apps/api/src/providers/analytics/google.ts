import type { Csp } from '../base'
import { AnalyticsProvider } from './base'

interface GoogleAnalyticsOptions {
  siteTag: string
}

export default class GoogleAnalyticsProvider extends AnalyticsProvider {
  private siteTag: string

  constructor(options: Partial<GoogleAnalyticsOptions>) {
    super()
    if (!options.siteTag) {
      throw new Error('GoogleAnalyticsProvider is missing siteTag')
    }

    this.siteTag = options.siteTag
  }

  getScriptUrl(): string {
    return `https://www.googletagmanager.com/gtag/js?id=${this.siteTag}`
  }

  override getCspRules(): Csp {
    return {
      'connect-src': [
        'https://www.google-analytics.com/',
        'https://*.google-analytics.com/',
        'https://*.analytics.google.com/',
      ],
    }
  }
}
