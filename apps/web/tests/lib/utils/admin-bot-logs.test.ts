import {
  parseAdminBotLogs,
  validateAdminBotInput,
  type AdminBotLogEntry,
} from '$lib/utils/admin-bot-logs'
import { describe, expect, test } from 'bun:test'

describe('parseAdminBotLogs', () => {
  test('parses a valid line into every field', () => {
    const line = JSON.stringify({
      time: 1710000000000,
      level: 'warn',
      prefix: 'navigation',
      line: 'visiting target',
      extra: { url: 'https://example.com', attempt: 2 },
    })
    expect(parseAdminBotLogs(line)).toEqual([
      {
        time: 1710000000000,
        level: 'warn',
        prefix: 'navigation',
        line: 'visiting target',
        extra: { url: 'https://example.com', attempt: 2 },
      },
    ])
  })

  test('parses multiple lines in order', () => {
    const jsonl = [
      JSON.stringify({
        time: 1,
        level: 'info',
        prefix: 'a',
        line: 'first',
        extra: {},
      }),
      JSON.stringify({
        time: 2,
        level: 'error',
        prefix: 'b',
        line: 'second',
        extra: {},
      }),
    ].join('\n')
    expect(parseAdminBotLogs(jsonl).map(entry => entry.line)).toEqual([
      'first',
      'second',
    ])
  })

  const levels: AdminBotLogEntry['level'][] = ['info', 'warn', 'error', 'fatal']
  test.each(levels)('keeps the valid level %p', level => {
    const result = parseAdminBotLogs(
      JSON.stringify({ time: 1, level, prefix: 'a', line: 'x', extra: {} })
    )
    expect(result[0]?.level).toBe(level)
  })

  test('skips a malformed JSON line without throwing', () => {
    const jsonl = [
      JSON.stringify({
        time: 1,
        level: 'info',
        prefix: 'a',
        line: 'ok',
        extra: {},
      }),
      '{ this is not json',
      JSON.stringify({
        time: 2,
        level: 'info',
        prefix: 'b',
        line: 'also ok',
        extra: {},
      }),
    ].join('\n')
    expect(parseAdminBotLogs(jsonl).map(entry => entry.line)).toEqual([
      'ok',
      'also ok',
    ])
  })

  test('skips JSON that is not an object', () => {
    const jsonl = ['42', '"a string"', 'null', '[1,2,3]'].join('\n')
    expect(parseAdminBotLogs(jsonl)).toEqual([])
  })

  test('tolerates missing fields with safe defaults', () => {
    expect(parseAdminBotLogs(JSON.stringify({ line: 'only a line' }))).toEqual([
      { time: 0, level: 'info', prefix: '', line: 'only a line', extra: {} },
    ])
  })

  test('coerces an unknown level to info', () => {
    const result = parseAdminBotLogs(
      JSON.stringify({
        time: 1,
        level: 'debug',
        prefix: 'a',
        line: 'x',
        extra: {},
      })
    )
    expect(result[0]?.level).toBe('info')
  })

  test('preserves nested extra key-values', () => {
    const extra = { status: 500, headers: { 'content-type': 'text/html' } }
    const result = parseAdminBotLogs(
      JSON.stringify({
        time: 1,
        level: 'error',
        prefix: 'network',
        line: 'failed',
        extra,
      })
    )
    expect(result[0]?.extra).toEqual(extra)
  })

  test('returns an empty array for an empty string', () => {
    expect(parseAdminBotLogs('')).toEqual([])
  })

  test('ignores blank and whitespace-only lines, including a trailing newline', () => {
    const jsonl =
      JSON.stringify({
        time: 1,
        level: 'info',
        prefix: 'a',
        line: 'kept',
        extra: {},
      }) + '\n\n   \n'
    expect(parseAdminBotLogs(jsonl).map(entry => entry.line)).toEqual(['kept'])
  })
})

describe('validateAdminBotInput', () => {
  test('accepts a value matching the pattern', () => {
    expect(
      validateAdminBotInput('https://example.com', { pattern: '^https?://' })
    ).toEqual({ valid: true })
  })

  test('rejects a value that does not match, with a format error', () => {
    const result = validateAdminBotInput('ftp://example.com', {
      pattern: '^https?://',
    })
    expect(result.valid).toBe(false)
    expect(result.error).toBe(
      'Does not match the required format (^https?://).'
    )
  })

  test('rejects an empty value as required', () => {
    expect(validateAdminBotInput('', { pattern: '.*' })).toEqual({
      valid: false,
      error: 'This field is required.',
    })
  })

  test('rejects a whitespace-only value as required', () => {
    expect(validateAdminBotInput('   ', { pattern: '.*' }).valid).toBe(false)
  })

  test('skips validation when the server pattern is not a valid RegExp', () => {
    expect(validateAdminBotInput('anything', { pattern: '(' })).toEqual({
      valid: true,
    })
  })

  test('respects case-insensitive flags', () => {
    expect(
      validateAdminBotInput('ABC', { pattern: '^abc$', flags: 'i' })
    ).toEqual({ valid: true })
    expect(validateAdminBotInput('ABC', { pattern: '^abc$' }).valid).toBe(false)
  })
})
