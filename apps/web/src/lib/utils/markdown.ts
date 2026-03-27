import DOMPurify from 'dompurify'
import { marked, type TokenizerAndRendererExtension } from 'marked'

export type AlertType =
  | 'note'
  | 'tip'
  | 'important'
  | 'warning'
  | 'caution'
  | 'connection'

interface AlertToken {
  type: 'alert'
  raw: string
  alertType: AlertType
  content: string
}

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const alertExtension: TokenizerAndRendererExtension = {
  name: 'alert',
  level: 'block',
  start: src => src.match(/^> \[!/)?.index,
  tokenizer(src): AlertToken | undefined {
    const match =
      /^(?:> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|CONNECTION)\]\n)((?:> .*(?:\n|$))+)/i.exec(
        src
      )
    if (!match?.[1] || !match[2]) return

    const alertType = match[1].toLowerCase()
    if (!isAlertType(alertType)) return

    return {
      type: 'alert',
      raw: match[0],
      alertType,
      content: match[2]
        .split('\n')
        .map(line => line.replace(/^> ?/, ''))
        .join('\n')
        .trim(),
    }
  },
  renderer(token) {
    const { alertType, content } = token
    return `<div data-alert data-type="${alertType}" data-content="${escapeHtml(content)}"></div>`
  },
}

function isAlertType(value: string): value is AlertType {
  return [
    'note',
    'tip',
    'important',
    'warning',
    'caution',
    'connection',
  ].includes(value)
}

const timerExtension: TokenizerAndRendererExtension = {
  name: 'timer',
  level: 'inline',
  start: src => src.match(/<timer/i)?.index,
  tokenizer(src) {
    const match = /^<timer\s*\/?>(?:<\/timer>)?/i.exec(src)
    if (!match) return
    return {
      type: 'timer',
      raw: match[0],
    }
  },
  renderer() {
    return '<span data-timer></span>'
  },
}

marked.use({ extensions: [alertExtension, timerExtension] })

// TODO(es3n1n): a better way how to make marked not treat lines after html code as continuation of the html block
const ensureHtmlBlockSeparation = (content: string) =>
  content.replace(
    /(<\/(?:div|p|blockquote|pre|table|dl|ol|ul|fieldset|details|dialog|figure|figcaption|footer|form|header|hr|main|nav|search|section|h[1-6])>|<(?:hr|br|img|input|source|track|wbr)\b[^>]*\/?>)\n(?!\n)/gi,
    '$1\n\n'
  )

export const parseAlertContent = (content: string) =>
  DOMPurify.sanitize(marked.parse(content) as string)

export const parseMarkdown = (content: string) =>
  DOMPurify.sanitize(
    marked.parse(ensureHtmlBlockSeparation(content)) as string,
    {
      ADD_ATTR: ['data-alert', 'data-type', 'data-content', 'data-timer'],
    }
  )
