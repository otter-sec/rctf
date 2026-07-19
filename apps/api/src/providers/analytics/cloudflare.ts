import type { Csp } from '../base'
import { AnalyticsProvider } from './base'

interface CloudflareAnalyticsOptions {
  token: string
}

export default class CloudflareAnalyticsProvider extends AnalyticsProvider {
  private token: string

  constructor(options: Partial<CloudflareAnalyticsOptions>) {
    super()
    if (!options.token) {
      throw new Error('CloudflareAnalyticsProvider is missing token')
    }

    this.token = options.token
  }

  getScriptUrl(): string {
    return `https://static.cloudflareinsights.com/beacon.min.js?token=${this.token}`
  }

  // https://developers.cloudflare.com/fundamentals/reference/policies-compliances/content-security-policies/#product-requirements
  override getCspRules(): Csp {
    return {
      'connect-src': ['https://cloudflareinsights.com/'],
    }
  }
}
