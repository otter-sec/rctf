import { randomBytes } from 'node:crypto'
import { TAIL_BYTES, type ParsedDynamicFlag } from './format'

export const randomizeTail = (parsed: ParsedDynamicFlag): string => {
  const encoded = randomBytes(TAIL_BYTES).toString('hex')
  const content = parsed.content ? `${parsed.content}_${encoded}` : encoded
  return `${parsed.prefix}{${content}}`
}
