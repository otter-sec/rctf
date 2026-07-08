import { SITE } from '@/consts'
import type { MarkdownHeading } from 'astro'
import type { InlineRendered } from './frontmatter-inline'
import { plainInline } from './inline-markdown'

export const pageTitle = (title: string) => `${plainInline(title)} | ${SITE.title}`

const escapeHtml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

export type InlineLabel = string | InlineRendered

export const asInline = (label: InlineLabel): InlineRendered =>
  typeof label === 'string' ? { html: escapeHtml(label), text: label } : label

type RenderedFrontmatter = {
  inline?: Partial<Record<'title' | 'description', InlineRendered>>
  tocHtml?: Record<string, string>
}

type RenderableEntry = {
  rendered?: { metadata?: Record<string, unknown> }
  data: { title?: unknown; description?: unknown }
}

export function entryInline(
  entry: RenderableEntry,
  field: 'title' | 'description'
): InlineRendered {
  const frontmatter = entry.rendered?.metadata?.frontmatter as RenderedFrontmatter | undefined
  const rendered = frontmatter?.inline?.[field]
  if (rendered) return rendered
  const raw = String(entry.data[field] ?? '')
  return { html: escapeHtml(raw), text: raw }
}

export type TocHeading = MarkdownHeading & { html?: string }

export function enrichHeadings(headings: MarkdownHeading[], frontmatter: unknown): TocHeading[] {
  const inner = (frontmatter as RenderedFrontmatter | undefined)?.tocHtml
  if (!inner) return headings
  return headings.map(heading => {
    const html = inner[heading.slug]
    return html && html !== heading.text ? { ...heading, html } : heading
  })
}
