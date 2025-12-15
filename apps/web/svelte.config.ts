import adapter from '@sveltejs/adapter-static'
import type { Config } from '@sveltejs/kit'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

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
    csp: {
      directives: {
        'default-src': ['none'],
        'script-src': ['self', 'static.cloudflareinsights.com', 'www.google.com', 'www.gstatic.com', 'js.hcaptcha.com', 'challenges.cloudflare.com'],
        'style-src': ['self', 'unsafe-inline'],
        'connect-src': ['self', 'cloudflareinsights.com'],
        'img-src': ['*', 'blob:'],
        'font-src': ['self'],
        'frame-src': ['https://www.youtube.com', 'https://youtube.com', 'https://www.youtube-nocookie.com', 'https://www.google.com', 'https://newassets.hcaptcha.com', 'https://challenges.cloudflare.com'],
        'frame-ancestors': ['self'],
      },
    },
  },
}

export default config
