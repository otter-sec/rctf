import { config } from '@rctf/config'
import { defineCommand } from 'citty'

type Csp = Record<string, string[]>

const BASE_CSP: Csp = {
  'style-src': ["'self'", "'unsafe-inline'"],
  'connect-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'"],
  'img-src': ['http:', 'https:', 'blob:', 'data:'],
  'frame-src': [
    'https://www.youtube.com',
    'https://youtube.com',
    'https://www.youtube-nocookie.com',
  ],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'object-src': ["'none'"],
  'media-src': ["'none'"],
  'manifest-src': ["'none'"],
}

// TODO: instead of hardcoding links here, we should define them on provider level somehow
const UPLOAD_PROVIDER_CSP: Record<string, Csp> = {
  'uploads/local': {},

  'uploads/s3': {
    'connect-src': ['https://*.amazonaws.com/'],
  },

  'uploads/gcs': {
    'connect-src': ['https://*.storage.googleapis.com/'],
  },

  'uploads/r2': {
    'connect-src': [
      process.env.RCTF_R2_PUBLIC_BASE_URL ??
        (config.uploadProvider.options as { publicBaseUrl: string })
          .publicBaseUrl,
    ],
  },
}

// https://developers.cloudflare.com/fundamentals/reference/policies-compliances/content-security-policies/#product-requirements
// https://developers.google.com/recaptcha/docs/faq#im-using-content-security-policy-csp-on-my-website.-how-can-i-configure-it-to-work-with-recaptcha
// https://docs.hcaptcha.com/#content-security-policy-settings
// https://developers.cloudflare.com/turnstile/reference/content-security-policy
const CAPTCHA_PROVIDER_CSP: Record<string, Csp> = {
  'captcha/recaptcha': {
    'connect-src': ['https://www.google.com/recaptcha/'],
    'frame-src': [
      'https://www.google.com/recaptcha/',
      'https://recaptcha.google.com/recaptcha/',
    ],
  },

  'captcha/hcaptcha': {
    'style-src': ['https://hcaptcha.com', 'https://*.hcaptcha.com'],
    'connect-src': ['https://hcaptcha.com/', 'https://*.hcaptcha.com/'],
    'frame-src': ['https://hcaptcha.com', 'https://*.hcaptcha.com'],
  },

  'captcha/turnstile': {
    'frame-src': ['https://challenges.cloudflare.com'],
  },
}

const ANALYTICS_PROVIDER_CSP: Record<string, Csp> = {
  'analytics/google': {
    'connect-src': [
      'https://www.google-analytics.com/',
      'https://*.google-analytics.com/',
      'https://*.analytics.google.com/',
    ],
  },

  'analytics/cloudflare': {
    'connect-src': ['https://cloudflareinsights.com/'],
  },
}

const captchaProvider =
  config.captcha?.provider?.name ??
  (config.recaptcha ? 'captcha/recaptcha' : undefined)
const analyticsProvider =
  config.analytics?.provider.name ??
  (config.globalSiteTag ? 'analytics/google' : undefined)

const mergeCsp = (...fragments: Csp[]): string => {
  const merge: Csp = {}

  for (const fragment of fragments) {
    for (const [directive, sources] of Object.entries(fragment)) {
      merge[directive] ??= []
      merge[directive].push(...sources)
    }
  }

  let output = ''
  for (const [directive, sources] of Object.entries(merge)) {
    output += `${directive} ${sources.join(' ')}; `
  }

  return output.trimEnd()
}

const getSecurityHeaders = (): string => {
  const csp = mergeCsp(
    BASE_CSP,
    UPLOAD_PROVIDER_CSP[config.uploadProvider.name] ?? {},
    CAPTCHA_PROVIDER_CSP[captchaProvider ?? ''] ?? {},
    ANALYTICS_PROVIDER_CSP[analyticsProvider ?? ''] ?? {}
  )

  return [
    'add_header Referrer-Policy "no-referrer" always;',
    `add_header Content-Security-Policy "${csp}" always;`,
    'add_header X-Frame-Options "DENY" always;',
    'add_header X-Content-Type-Options "nosniff" always;',
    '',
  ].join('\n')
}

export default defineCommand({
  meta: {
    name: 'generate-csp',
    description: 'Generate nginx CSP header',
  },
  run: () => {
    process.stdout.write(getSecurityHeaders())
  },
})
