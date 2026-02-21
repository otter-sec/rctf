import adapter from '@sveltejs/adapter-static'
import type { Config } from '@sveltejs/kit'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/**
 * https://developers.cloudflare.com/fundamentals/reference/policies-compliances/content-security-policies/#product-requirements
 * https://developers.google.com/recaptcha/docs/faq#im-using-content-security-policy-csp-on-my-website.-how-can-i-configure-it-to-work-with-recaptcha
 * https://docs.hcaptcha.com/#content-security-policy-settings
 * https://developers.cloudflare.com/turnstile/reference/content-security-policy
 */

const dev = process.env.NODE_ENV === 'development'

const config: Config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: true,
      strict: true,
    }),
    typescript: {
      config: cfg => {
        cfg.extends = '../../../tsconfig.json'
      },
    },
    csp: dev
      ? undefined
      : {
          directives: {
            'default-src': ['none'],
            'script-src': [
              'self',
              // recaptcha
              'https://www.google.com/recaptcha/',
              'https://www.gstatic.com/recaptcha/',
              // hcaptcha
              'https://hcaptcha.com',
              'https://*.hcaptcha.com',
              // turnstile
              'https://challenges.cloudflare.com',
              // cloudflare web analytics
              'https://static.cloudflareinsights.com/',
              // google analytics
              'https://www.googletagmanager.com/',
              // plausible analytics (self-hosted instances need manual CSP update)
              'https://plausible.io/',
            ],
            'style-src': [
              'self',
              'unsafe-inline',
              // hcaptcha
              'https://hcaptcha.com',
              'https://*.hcaptcha.com',
            ],
            'connect-src': [
              'self',
              // scoreboard export
              'data:',
              'blob:',
              // icons in scoreboard screenshot
              'https://api.iconify.design/',
              // hcaptcha
              'https://hcaptcha.com/',
              'https://*.hcaptcha.com/',
              // recaptcha
              'https://www.google.com/recaptcha/',
              // google analytics
              'https://www.google-analytics.com/',
              'https://*.google-analytics.com/',
              'https://*.analytics.google.com/',
              // cloudflare web analytics
              'https://cloudflareinsights.com/',
              // plausible analytics (self-hosted instances need manual CSP update)
              'https://plausible.io/',
            ],
            'font-src': ['self'],
            'img-src': ['http:', 'https:', 'blob:', 'data:'],
            'frame-src': [
              // youtube iframes
              'https://www.youtube.com',
              'https://youtube.com',
              'https://www.youtube-nocookie.com',
              // recaptcha
              'https://www.google.com/recaptcha/',
              'https://recaptcha.google.com/recaptcha/',
              // hcaptcha
              'https://hcaptcha.com',
              'https://*.hcaptcha.com',
              // turnstile
              'https://challenges.cloudflare.com',
            ],
            'frame-ancestors': ['self'],
            'base-uri': ['self'],
            'form-action': ['self'],
            'object-src': ['none'],
          },
        },
  },
}

export default config
