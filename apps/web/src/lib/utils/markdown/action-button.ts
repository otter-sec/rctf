import type { TokenizerAndRendererExtension } from 'marked'
import { escapeAttribute, getPurify, nonce } from '$lib/utils/markdown/sanitize'

interface ActionButtonToken {
  type: 'actionButton'
  raw: string
  href: string
  label: string
}

const ACTION_BUTTON_BLOCK = new RegExp(
  String.raw`^<action-button\s+href=(?:"([^"\n]*)"|'([^'\n]*)')\s*>` +
    String.raw`\s*([\s\S]*?)\s*</action-button>[ \t]*(?:\n+|$)`,
  'i'
)

export const actionButton: TokenizerAndRendererExtension = {
  name: 'actionButton',
  level: 'block',
  start: src => src.match(/^<action-button/im)?.index,
  tokenizer(src): ActionButtonToken | undefined {
    const match = ACTION_BUTTON_BLOCK.exec(src)
    if (!match) return undefined
    return {
      type: 'actionButton',
      raw: match[0],
      href: match[1] ?? match[2] ?? '',
      label: (match[3] ?? '')
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    }
  },
  renderer(token) {
    const { href, label } = token
    // data-href bypasses DOMPurify's anchor sanitization, so vet the URL here
    const safeHref = getPurify().isValidAttribute('a', 'href', href) ? href : ''
    return (
      `<div data-action-button data-nonce="${nonce}"` +
      ` data-href="${escapeAttribute(safeHref)}"` +
      ` data-content="${escapeAttribute(label)}"></div>`
    )
  },
}
