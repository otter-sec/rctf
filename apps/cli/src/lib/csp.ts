import type { Csp } from '@rctf/api/src/providers/base'

const ATTRIBUTE_PATTERN =
  /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g

const getAttribute = (tag: string, name: string): string | undefined => {
  for (const match of tag.matchAll(ATTRIBUTE_PATTERN)) {
    if (match[1]?.toLowerCase() === name.toLowerCase()) {
      return match[2] ?? match[3] ?? match[4]
    }
  }

  return undefined
}

export const extractCspFromMeta = (html: string): Csp => {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? []
  const cspMeta = metaTags.find(
    tag =>
      getAttribute(tag, 'http-equiv')?.toLowerCase() ===
      'content-security-policy'
  )

  if (!cspMeta) {
    throw new Error(
      'Svelte build is missing its Content-Security-Policy meta tag.'
    )
  }

  const csp: Csp = {}
  const content = getAttribute(cspMeta, 'content') ?? ''

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
      const mergedSources = new Set(merged[directive] ?? [])

      for (const source of sources) {
        mergedSources.add(source)
      }

      merged[directive] = [...mergedSources]
    }
  }

  return merged
}

export const serializeCsp = (csp: Csp): string =>
  Object.entries(csp)
    .map(([directive, sources]) =>
      [directive, ...sources].join(' ').concat(';')
    )
    .join(' ')
