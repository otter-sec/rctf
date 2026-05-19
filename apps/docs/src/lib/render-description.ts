import type { Element } from 'hast'
import { toHtml } from 'hast-util-to-html'
import { codeToHtml } from 'shiki'
import {
  CODE_SEMANTIC_TAGS,
  parseCodeSemantics,
  stripCodeTags,
} from './code-semantics'
import { darkTheme, lightTheme } from './shiki-themes'

const PATTERN = /`([^`]+?)(?:\{:([a-z0-9]+)\})?`/g
const INLINE_CODE_SEMANTIC_RE = new RegExp(
  `<(${CODE_SEMANTIC_TAGS.join('|')})>[\\s\\S]*?<\\/\\1>`,
  'g'
)

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function inlineCodeHtml(code: string): string {
  const semanticChildren = parseCodeSemantics(code)
  if (semanticChildren) {
    const node: Element = {
      type: 'element',
      tagName: 'code',
      properties: { className: ['inline-code-enhanced', 'inline-code-with-tones'] },
      children: semanticChildren,
    }
    return toHtml(node)
  }

  return `<code>${escapeHtml(code)}</code>`
}

function textHtml(text: string): string {
  const parts: string[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = INLINE_CODE_SEMANTIC_RE.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(escapeHtml(text.slice(lastIndex, match.index)))
    parts.push(inlineCodeHtml(match[0]))
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) parts.push(escapeHtml(text.slice(lastIndex)))
  return parts.join('')
}

export interface RenderedDescription {
  html: string
  plain: string
}

export async function renderDescription(text: string): Promise<RenderedDescription> {
  const plain = stripCodeTags(text.replace(PATTERN, (_, code) => stripCodeTags(code)))

  const re = new RegExp(PATTERN.source, 'g')
  const parts: string[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(text)) !== null) {
    const [full, code, lang] = match
    if (match.index > lastIndex) {
      parts.push(textHtml(text.slice(lastIndex, match.index)))
    }
    if (lang) {
      const rendered = await codeToHtml(code, {
        lang,
        themes: { light: lightTheme, dark: darkTheme },
        structure: 'inline',
      })
      parts.push(`<span class="shiki">${rendered}</span>`)
    } else {
      parts.push(inlineCodeHtml(code))
    }
    lastIndex = match.index + full.length
  }

  if (lastIndex < text.length) {
    parts.push(textHtml(text.slice(lastIndex)))
  }

  return { html: parts.join(''), plain }
}
