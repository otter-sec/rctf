import type { ClientConfig } from '@rctf/types'
import { loadScriptOnce } from '$lib/utils/script-loader'

interface AnalyticsHandler {
  init: (options: Record<string, string>) => Promise<void>
}

let analyticsInitPromise: Promise<void> | null = null
const ANALYTICS_SCRIPT_URL = '/api/v2/integrations/analytics/script'

const googleHandler: AnalyticsHandler = {
  async init(options) {
    const siteTag = options.siteTag
    if (!siteTag) {
      throw new Error('Google Analytics requires siteTag')
    }

    await loadScriptOnce(ANALYTICS_SCRIPT_URL)

    const dataLayer = window.dataLayer ?? []
    window.dataLayer = dataLayer
    window.gtag = function () {
      dataLayer.push(arguments)
    }
    window.gtag('js', new Date())
    window.gtag('config', siteTag)
  },
}

const cloudflareHandler: AnalyticsHandler = {
  async init(options) {
    const token = options.token
    if (!token) {
      throw new Error('Cloudflare Web Analytics requires token')
    }

    await loadScriptOnce(ANALYTICS_SCRIPT_URL)
  },
}

const analyticsHandlers: Record<string, AnalyticsHandler> = {
  'analytics/google': googleHandler,
  'analytics/cloudflare': cloudflareHandler,
}

export async function initAnalytics(
  config: ClientConfig | undefined | null
): Promise<void> {
  const analytics = config?.analytics
  if (!analytics) return

  if (analyticsInitPromise) return analyticsInitPromise

  const handler = analyticsHandlers[analytics.provider]
  if (!handler) {
    console.warn(`Unknown analytics provider: ${analytics.provider}`)
    return
  }

  analyticsInitPromise = handler.init(analytics.publicOptions)
  return analyticsInitPromise
}
