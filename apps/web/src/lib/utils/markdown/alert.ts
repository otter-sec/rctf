import type { TokenizerAndRendererExtension } from 'marked'
import { escapeAttribute, nonce } from '$lib/utils/markdown/sanitize'

export const ALERT_TYPES = [
  'note',
  'tip',
  'important',
  'warning',
  'caution',
  'connection',
] as const

export type AlertType = (typeof ALERT_TYPES)[number]

export const isAlertType = (value: string): value is AlertType =>
  (ALERT_TYPES as readonly string[]).includes(value)

interface AlertToken {
  type: 'alert'
  raw: string
  alertType: AlertType
  content: string
}

export const alert: TokenizerAndRendererExtension = {
  name: 'alert',
  level: 'block',
  start: src => src.match(/^> \[!/m)?.index,
  tokenizer(src): AlertToken | undefined {
    const match = /^> \[!(\w+)\]\n((?:> .*(?:\n|$))+)/i.exec(src)
    if (!match?.[1] || !match[2]) return undefined
    const alertType = match[1].toLowerCase()
    if (!isAlertType(alertType)) return undefined
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
    return (
      `<div data-alert data-nonce="${nonce}" data-type="${alertType}"` +
      ` data-content="${escapeAttribute(content)}"></div>`
    )
  },
}
