import DOMPurify from 'dompurify'
import { Marked, type TokenizerAndRendererExtension } from 'marked'

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

// hydration placeholders carry a per-session secret so hand-written
// data-alert/data-timer attributes in user markdown are stripped by the
// sanitizer hook below — only extension-emitted placeholders may hydrate
// (product requirement 07 §2)
const nonce = crypto.randomUUID()
const HYDRATION_ATTRS = [
  'data-alert',
  'data-type',
  'data-content',
  'data-timer',
]

// escaping for a double-quoted attribute value (the data-content payload)
const escapeAttribute = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const alert: TokenizerAndRendererExtension = {
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

const TIMER_TAG = String.raw`<timer\s*/?>(?:</timer>)?`
const TIMER_INLINE = new RegExp(`^${TIMER_TAG}`, 'i')
const TIMER_BLOCK = new RegExp(String.raw`^${TIMER_TAG}[ \t]*(?:\n+|$)`, 'i')
const timerPlaceholder = `<span data-timer data-nonce="${nonce}"></span>`

const timerInline: TokenizerAndRendererExtension = {
  name: 'timer',
  level: 'inline',
  start: src => src.match(/<timer/i)?.index,
  tokenizer(src) {
    const match = TIMER_INLINE.exec(src)
    return match ? { type: 'timer', raw: match[0] } : undefined
  },
  renderer: () => timerPlaceholder,
}

// a standalone <timer /> line is a CommonMark html *block*, which inline
// extensions never see, and marked extensions are single-level — hence this
// block twin
const timerBlock: TokenizerAndRendererExtension = {
  name: 'timerBlock',
  level: 'block',
  start: src => src.match(/^<timer/im)?.index,
  tokenizer(src) {
    const match = TIMER_BLOCK.exec(src)
    return match ? { type: 'timerBlock', raw: match[0] } : undefined
  },
  renderer: () => `<p>${timerPlaceholder}</p>`,
}

// marked treats lines directly after closing block-level html as part of the
// html block; force a blank line so following markdown still gets parsed.
// fenced code is passed through untouched so the inserted blank line cannot
// corrupt code content
const FENCED_CODE =
  /(^|\n)(?:```|~~~)[^\n]*\n[\s\S]*?\n(?:```|~~~)[ \t]*(?=\n|$)/g
const BLOCK_HTML_BOUNDARY =
  /(<\/(?:div|p|blockquote|pre|table|dl|ol|ul|fieldset|details|dialog|figure|figcaption|footer|form|header|hr|main|nav|search|section|h[1-6])>|<(?:hr|br|img|input|source|track|wbr)\b[^>]*\/?>)\n(?!\n)/gi

const separateHtmlBlocks = (markdown: string): string => {
  const parts: string[] = []
  let last = 0
  for (const match of markdown.matchAll(FENCED_CODE)) {
    parts.push(
      markdown.slice(last, match.index).replace(BLOCK_HTML_BOUNDARY, '$1\n\n'),
      match[0]
    )
    last = match.index + match[0].length
  }
  parts.push(markdown.slice(last).replace(BLOCK_HTML_BOUNDARY, '$1\n\n'))
  return parts.join('')
}

// module-local instance so the hook below cannot leak to other dompurify
// consumers, created lazily so importing this module without a DOM (bun
// scripts, tests) does not throw on the `window` reference.
// note: DOMPurify returns input UNSANITIZED where no DOM exists
// (isSupported=false); safe here because the app is csr-only
// (src/routes/+layout.ts: ssr = false)
let purify: ReturnType<typeof DOMPurify> | undefined

const getPurify = () => {
  if (purify) return purify
  purify = DOMPurify(window)
  purify.addHook('afterSanitizeAttributes', node => {
    const emittedByExtension = node.getAttribute('data-nonce') === nonce
    node.removeAttribute('data-nonce')
    if (emittedByExtension) return
    for (const name of HYDRATION_ATTRS) node.removeAttribute(name)
  })
  return purify
}

const marked = new Marked({
  extensions: [alert, timerInline, timerBlock],
  hooks: {
    preprocess: separateHtmlBlocks,
    postprocess: html => getPurify().sanitize(html),
  },
})

export const parseMarkdown = (content: string): string =>
  marked.parse(content, { async: false })

// alert bodies go through the identical pipeline (nested alerts/timers
// included)
export const parseAlertContent = parseMarkdown
