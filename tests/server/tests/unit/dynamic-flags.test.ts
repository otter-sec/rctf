import { describe, expect, test } from 'bun:test'
import {
  countDynamicFlagCarrierBits,
  DYNAMIC_FLAG_MIN_BITS,
  DynamicFlagExhaustion,
  DynamicFlagMode,
  dynamicFlagConfigSchema,
  mintDynamicFlag,
  parseDynamicFlag,
} from '../../../../apps/api/src/providers/flags/dynamic'

const LEET_BASE = 'rctf{abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrst}'
const SHORT_BASE = 'rctf{short_dynamic_flag}'

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

const isLeetVariant = (base: string, actual: string): boolean => {
  if (actual === base) {
    return true
  }
  if (!/^[a-z]$/.test(base)) {
    return false
  }
  return actual === (leetDigits[base] ?? base.toUpperCase())
}

describe('parseDynamicFlag', () => {
  test('parses prefix and content', () => {
    expect(parseDynamicFlag('rctf{abc}')).toEqual({
      prefix: 'rctf',
      content: 'abc',
    })
    expect(parseDynamicFlag('rctf{}')).toEqual({ prefix: 'rctf', content: '' })
  })

  test('rejects malformed flags', () => {
    expect(parseDynamicFlag('{abc}')).toBeNull()
    expect(parseDynamicFlag('rctf{abc')).toBeNull()
    expect(parseDynamicFlag('rctfabc}')).toBeNull()
    expect(parseDynamicFlag('rctf{abc}x')).toBeNull()
    expect(parseDynamicFlag('rctf{ab\nc}')).toBeNull()
  })
})

describe('countDynamicFlagCarrierBits', () => {
  test('counts only lowercase letters', () => {
    expect(countDynamicFlagCarrierBits('abc_123')).toBe(3)
    expect(countDynamicFlagCarrierBits('ABC')).toBe(0)
    expect(countDynamicFlagCarrierBits('')).toBe(0)
  })
})

describe('mintDynamicFlag', () => {
  test('leet flags keep the base shape and only substitute variants', () => {
    const flag = mintDynamicFlag(LEET_BASE, DynamicFlagMode.LEET)
    expect(flag).not.toBeNull()
    expect(flag).toHaveLength(LEET_BASE.length)

    const base = parseDynamicFlag(LEET_BASE)!
    const minted = parseDynamicFlag(flag!)!
    expect(minted.prefix).toBe(base.prefix)
    for (let i = 0; i < base.content.length; i++) {
      expect(isLeetVariant(base.content[i]!, minted.content[i]!)).toBe(true)
    }
  })

  test('leet flags randomize every carrier over repeated mints', () => {
    const base = parseDynamicFlag(LEET_BASE)!
    const changed = new Set<number>()
    for (let mints = 0; mints < 64; mints++) {
      const flag = mintDynamicFlag(LEET_BASE, DynamicFlagMode.LEET)!
      const minted = parseDynamicFlag(flag)!
      for (let i = 0; i < base.content.length; i++) {
        if (minted.content[i] !== base.content[i]) {
          changed.add(i)
        }
      }
    }

    // With 64 mints, every carrier flips away from its base form at least
    // once except with probability ~2^-58
    expect(changed.size).toBe(countDynamicFlagCarrierBits(base.content))
  })

  test('leet mode works at exactly the minimum carrier count', () => {
    const base = `rctf{${'abcdefghijklmnopqrstuvwxyz'.slice(0, DYNAMIC_FLAG_MIN_BITS)}}`
    const flag = mintDynamicFlag(base, DynamicFlagMode.LEET)
    expect(flag).not.toBeNull()
    expect(flag).toHaveLength(base.length)
  })

  test('tail flags append 10 hex characters', () => {
    const flag = mintDynamicFlag(SHORT_BASE, DynamicFlagMode.TAIL)
    expect(flag).toMatch(/^rctf\{short_dynamic_flag_[0-9a-f]{10}\}$/)
  })

  test('tail flags on an empty content omit the separator', () => {
    const flag = mintDynamicFlag('flag{}', DynamicFlagMode.TAIL)
    expect(flag).toMatch(/^flag\{[0-9a-f]{10}\}$/)
  })

  test('tail mode overrides a leet-capable base', () => {
    expect(mintDynamicFlag(LEET_BASE, DynamicFlagMode.TAIL)).toMatch(
      /_[0-9a-f]{10}\}$/
    )
  })

  test('auto picks leet when the base has capacity and tail otherwise', () => {
    expect(mintDynamicFlag(LEET_BASE, DynamicFlagMode.AUTO)).toHaveLength(
      LEET_BASE.length
    )
    expect(mintDynamicFlag(SHORT_BASE, DynamicFlagMode.AUTO)).toMatch(
      /^rctf\{short_dynamic_flag_[0-9a-f]{10}\}$/
    )
  })

  test('leet mode fails when the base lacks capacity', () => {
    expect(mintDynamicFlag(SHORT_BASE, DynamicFlagMode.LEET)).toBeNull()
  })

  test('rejects a malformed base', () => {
    expect(mintDynamicFlag('no braces here', DynamicFlagMode.AUTO)).toBeNull()
  })

  test('mints are random', () => {
    expect(mintDynamicFlag(LEET_BASE, DynamicFlagMode.LEET)).not.toBe(
      mintDynamicFlag(LEET_BASE, DynamicFlagMode.LEET)
    )
    expect(mintDynamicFlag(SHORT_BASE, DynamicFlagMode.TAIL)).not.toBe(
      mintDynamicFlag(SHORT_BASE, DynamicFlagMode.TAIL)
    )
  })
})

describe('dynamicFlagConfigSchema', () => {
  test('accepts a valid config and applies defaults', () => {
    const parsed = dynamicFlagConfigSchema.safeParse({ base: SHORT_BASE })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.mode).toBe(DynamicFlagMode.AUTO)
      expect(parsed.data.exhaustion).toBe(DynamicFlagExhaustion.TAIL)
    }
  })

  test('accepts duplicate exhaustion and rejects unknown values', () => {
    expect(
      dynamicFlagConfigSchema.safeParse({
        base: SHORT_BASE,
        exhaustion: DynamicFlagExhaustion.DUPLICATE,
      }).success
    ).toBe(true)
    expect(
      dynamicFlagConfigSchema.safeParse({ base: SHORT_BASE, exhaustion: 'nah' })
        .success
    ).toBe(false)
  })

  test('rejects a base without the flag format', () => {
    expect(dynamicFlagConfigSchema.safeParse({ base: 'nope' }).success).toBe(
      false
    )
    expect(dynamicFlagConfigSchema.safeParse({ base: '' }).success).toBe(false)
  })

  test('rejects leet mode without enough carriers', () => {
    const parsed = dynamicFlagConfigSchema.safeParse({
      base: SHORT_BASE,
      mode: DynamicFlagMode.LEET,
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(JSON.stringify(parsed.error.issues)).toContain(
        `Leet mode requires at least ${DYNAMIC_FLAG_MIN_BITS} encodable characters`
      )
    }
  })

  test('rejects an unknown mode', () => {
    expect(
      dynamicFlagConfigSchema.safeParse({ base: SHORT_BASE, mode: 'bogus' })
        .success
    ).toBe(false)
  })

  test('rejects unknown keys', () => {
    expect(
      dynamicFlagConfigSchema.safeParse({ base: SHORT_BASE, extra: true })
        .success
    ).toBe(false)
  })
})
