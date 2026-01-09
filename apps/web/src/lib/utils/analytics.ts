import type { ClientConfig } from '@rctf/types'
import { loadScriptOnce } from './script-loader'

interface AnalyticsHandler {
  init: (options: Record<string, string>) => Promise<void>
}

let analyticsInitPromise: Promise<void> | null = null

// Google Analytics (GA4)
const googleHandler: AnalyticsHandler = {
  async init(options) {
    const siteTag = options.siteTag
    if (!siteTag) {
      throw new Error('Google Analytics requires siteTag')
    }

    await loadScriptOnce(
      `https://www.googletagmanager.com/gtag/js?id=${siteTag}`
    )

    window.dataLayer = window.dataLayer || []
    window.gtag = function () {
      window.dataLayer.push(arguments)
    }
    window.gtag('js', new Date())
    window.gtag('config', siteTag)
  },
}

// Cloudflare Web Analytics
const cloudflareHandler: AnalyticsHandler = {
  async init(options) {
    const token = options.token
    if (!token) {
      throw new Error('Cloudflare Web Analytics requires token')
    }

    await loadScriptOnce(
      `https://static.cloudflareinsights.com/beacon.min.js?token=${token}`
    )
  },
}

// Plausible Analytics
const plausibleHandler: AnalyticsHandler = {
  async init(options) {
    const domain = options.domain
    if (!domain) {
      throw new Error('Plausible Analytics requires domain')
    }

    const apiHost = options.apiHost || 'https://plausible.io'
    const script = document.createElement('script')
    script.defer = true
    script.dataset.domain = domain
    script.dataset.api = `${apiHost}/api/event`
    script.src = `${apiHost}/js/script.js`
    document.head.appendChild(script)

    await new Promise<void>((resolve, reject) => {
      script.onload = () => resolve()
      script.onerror = () =>
        reject(new Error('Failed to load Plausible script'))
    })
  },
}

const analyticsHandlers: Record<string, AnalyticsHandler> = {
  'analytics/google': googleHandler,
  'analytics/cloudflare': cloudflareHandler,
  'analytics/plausible': plausibleHandler,
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
