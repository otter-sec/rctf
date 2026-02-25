import type { AnalyticsProvider } from './base'

interface CloudflareAnalyticsOptions {
  token: string
}

export default class CloudflareAnalyticsProvider implements AnalyticsProvider {
  private token: string

  constructor(options: Partial<CloudflareAnalyticsOptions>) {
    if (!options.token) {
      throw new Error('CloudflareAnalyticsProvider is missing token')
    }

    this.token = options.token
  }

  getScriptUrl(): string {
    return `https://static.cloudflareinsights.com/beacon.min.js?token=${this.token}`
  }
}
