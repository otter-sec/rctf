import '@rctf/api/src/providers'
import { registeredProviders, type Csp } from '@rctf/api/src/providers/base'
import { config } from '@rctf/config'
import { join } from 'path'
import { defineCommand } from 'citty'
import { extractCspFromMeta, mergeCsp, serializeCsp } from '../../lib/csp'

const BASE_CSP: Csp = {
  'default-src': ["'none'"],
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
  'manifest-src': ["'self'"],
}

const getSecurityHeaders = (svelteCsp: Csp): string => {
  const csp = serializeCsp(
    mergeCsp(
      BASE_CSP,
      svelteCsp,
      ...registeredProviders.map(provider => provider.getCspRules()),
      config.csp
    )
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
  args: {
    'web-build': {
      type: 'string',
      default: 'apps/web/build',
      description: 'Path to the SvelteKit web build directory',
    },
  },
  run: async ({ args }) => {
    const html = await Bun.file(join(args['web-build'], 'index.html')).text()
    const svelteCsp = extractCspFromMeta(html)
    process.stdout.write(getSecurityHeaders(svelteCsp))
  },
})
