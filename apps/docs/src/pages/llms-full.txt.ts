import { SITE } from '@/consts'
import { buildDocsTree, docsHref, flattenDocsTree, getDocs } from '@/lib/docs'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ site }) => {
  const docs = await getDocs()
  const flat = flattenDocsTree(docs, buildDocsTree(docs))
  const base = site ?? new URL('http://localhost:4321')
  const byHref = new Map(docs.map(entry => [docsHref(entry.id), entry]))

  const sections = flat.flatMap(doc => {
    const entry = byHref.get(doc.href)
    if (!entry) return []
    return [
      [`# ${doc.title}`, `URL: ${new URL(doc.href, base)}`, '', (entry.body ?? '').trim(), ''].join(
        '\n'
      ),
    ]
  })

  const text = [`# ${SITE.title}`, '', `> ${SITE.description}`, '']
    .join('\n')
    .concat('\n', sections.join('\n---\n\n'))

  return new Response(text, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
