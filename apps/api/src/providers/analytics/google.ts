import type { AnalyticsProvider } from './base'

interface GoogleAnalyticsOptions {
  siteTag: string
}

export default class GoogleAnalyticsProvider implements AnalyticsProvider {
  private siteTag: string

  constructor(options: Partial<GoogleAnalyticsOptions>) {
    if (!options.siteTag) {
      throw new Error('GoogleAnalyticsProvider is missing siteTag')
    }

    this.siteTag = options.siteTag
  }

  getScriptUrl(): string {
    return `https://www.googletagmanager.com/gtag/js?id=${this.siteTag}`
  }
}
