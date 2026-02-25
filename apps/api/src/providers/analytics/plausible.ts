import type { AnalyticsProvider } from './base'

interface PlausibleAnalyticsOptions {
  apiHost?: string
}

export default class PlausibleAnalyticsProvider implements AnalyticsProvider {
  private apiHost: string

  constructor(options: Partial<PlausibleAnalyticsOptions>) {
    this.apiHost = options.apiHost || 'https://plausible.io'
  }

  getScriptUrl(): string {
    return `${this.apiHost}/js/script.js`
  }
}
