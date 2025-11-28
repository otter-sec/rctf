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
    const parsed = marked.parse(content) as string
    return `<div data-alert data-type="${alertType}" data-content="${escapeHtml(content)}" data-parsed="${escapeHtml(parsed)}"></div>`
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

marked.use({ extensions: [alertExtension] })

export const parseMarkdown = (content: string) =>
  marked.parse(content) as string
