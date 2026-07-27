import { randomBytes } from 'node:crypto'
import { DYNAMIC_FLAG_MIN_BITS, type ParsedDynamicFlag } from './format'

const leetDigits: Record<string, string> = {
  a: '4',
  e: '3',
  g: '6',
  i: '1',
  l: '1',
  o: '0',
  s: '5',
  t: '7',
}

const leetChars: Readonly<Record<string, readonly [string, string]>> =
  Object.fromEntries(
    Array.from('abcdefghijklmnopqrstuvwxyz', c => [
      c,
      [c, leetDigits[c] ?? c.toUpperCase()] as const,
    ])
  )

export const countDynamicFlagCarrierBits = (content: string): number =>
  [...content].filter(c => Object.hasOwn(leetChars, c)).length

export const leetCapable = (content: string): boolean =>
  countDynamicFlagCarrierBits(content) >= DYNAMIC_FLAG_MIN_BITS

export const randomizeLeet = (parsed: ParsedDynamicFlag): string => {
  const random = randomBytes(parsed.content.length)
  let content = ''
  for (let i = 0; i < parsed.content.length; i++) {
    const character = parsed.content[i]!
    const variants = leetChars[character]
    if (variants) {
      content += variants[random[i]! & 1]!
    } else {
      content += character
    }
  }
  return `${parsed.prefix}{${content}}`
}
