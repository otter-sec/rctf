import type { Csp } from '@rctf/api/src/providers/base'

// oxlint-disable-next-line no-control-regex
const unsafeCspCharacters = /[\u0000-\u0020"$;\\\u007f-\u009f]/g

export const sanitizeCspToken = (value: string): string =>
  value.replace(unsafeCspCharacters, encodeURIComponent)

export const extractCspFromMeta = (html: string): Csp => {
  let content: string | undefined

  new HTMLRewriter()
    .on('meta[http-equiv="content-security-policy" i]', {
      element(element) {
        content ??= element.getAttribute('content') ?? ''
      },
    })
    .transform(html)

  if (content === undefined) {
    throw new Error(
      'Svelte build is missing its Content-Security-Policy meta tag'
    )
  }

  const csp: Csp = {}

  for (const directiveValue of content.split(';')) {
    const [rawDirective, ...sources] = directiveValue.trim().split(/\s+/)
    if (!rawDirective) {
      continue
    }

    const directive = rawDirective.toLowerCase()
    csp[directive] ??= sources
  }

  return csp
}

export const mergeCsp = (...fragments: Csp[]): Csp => {
  const merged: Csp = {}

  for (const fragment of fragments) {
    for (const [rawDirective, sources] of Object.entries(fragment)) {
      const directive = rawDirective.toLowerCase()
      merged[directive] = [
        ...new Set([...(merged[directive] ?? []), ...sources]),
      ]
    }
  }

  return merged
}

export const serializeCsp = (csp: Csp): string =>
  Object.entries(csp)
    .map(([directive, sources]) =>
      [directive, ...sources].map(sanitizeCspToken).join(' ').concat(';')
    )
    .join(' ')
