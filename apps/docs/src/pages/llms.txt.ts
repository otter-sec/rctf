import { SITE } from '@/consts'
import { buildDocsTree, docsHref, docsMdHref, flattenDocsTree, getDocs } from '@/lib/docs'
import { plainInlineText } from '@/lib/rich-text'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ site }) => {
  const docs = await getDocs()
  const flat = flattenDocsTree(docs, buildDocsTree(docs))
  const base = site ?? new URL('http://localhost:4321')
  const byHref = new Map(docs.map(entry => [docsHref(entry.id), entry]))

  const lines = flat.map(doc => {
    const entry = byHref.get(doc.href)
    const title = plainInlineText(doc.title)
    if (!entry) return `- [${title}](${new URL(doc.href, base)})`
    const url = new URL(docsMdHref(entry.id), base)
    const description = entry.data.description ? plainInlineText(entry.data.description) : null
    return `- [${title}](${url})${description ? `: ${description}` : ''}`
  })

  const text = [
    `# ${SITE.title}`,
    '',
    `> ${SITE.description}`,
    '',
    '## Docs',
    '',
    ...lines,
    '',
  ].join('\n')

  return new Response(text, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
