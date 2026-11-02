import type { TokenizerAndRendererExtension } from 'marked'
import { nonce } from '$lib/utils/markdown/sanitize'

const TIMER_TAG = String.raw`<timer\s*/?>(?:</timer>)?`
const TIMER_BLOCK = new RegExp(String.raw`^${TIMER_TAG}[ \t]*(?:\n+|$)`, 'i')
const timerPlaceholder = `<div data-timer data-nonce="${nonce}"></div>`

export const timer: TokenizerAndRendererExtension = {
  name: 'timer',
  level: 'block',
  start: src => src.match(/^<timer/im)?.index,
  tokenizer(src) {
    const match = TIMER_BLOCK.exec(src)
    return match ? { type: 'timer', raw: match[0] } : undefined
  },
  renderer: () => timerPlaceholder,
}
