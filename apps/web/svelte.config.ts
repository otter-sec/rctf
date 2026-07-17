import adapter from '@sveltejs/adapter-static'
import type { Config } from '@sveltejs/kit'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

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
    alias: {
      $routes: 'src/routes',
    },
    typescript: {
      config: cfg => {
        cfg.extends = '../../../tsconfig.json'
      },
    },
    csp: dev
      ? undefined
      : {
          directives: {
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
            ],
          },
        },
  },
}

export default config
