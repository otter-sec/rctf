import '@rctf/api/src/providers'
import { registeredProviders, type Csp } from '@rctf/api/src/providers/base'
import { defineCommand } from 'citty'

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
    ...registeredProviders.map(provider => provider.getCspRules())
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
