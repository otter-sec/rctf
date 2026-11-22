import { describe, expect, test } from 'bun:test'
import { stripVTControlCharacters } from 'node:util'
import { parseArgs } from 'citty'
import {
  collectPositionalInputs,
  DEFAULT_LOCAL_FLAG,
  localFlag,
  normalizeCliAliases,
  parseTimeout,
  renderLogs,
  shouldNormalizeInputRules,
  validateInput,
} from '../src/lib'

describe('localFlag', () => {
  test('uses the default local flag', () => {
    expect(localFlag({})).toBe(DEFAULT_LOCAL_FLAG)
  })

  test('uses the FLAG environment variable when set', () => {
    expect(localFlag({ FLAG: 'ctf{custom_flag}' })).toBe('ctf{custom_flag}')
  })
})

describe('normalizeCliAliases', () => {
  test('normalizes the gui alias', () => {
    expect(normalizeCliAliases(['bot.ts', '--gui'])).toEqual([
      'bot.ts',
      '--headful',
    ])
    expect(normalizeCliAliases(['bot.ts', '--no-gui'])).toEqual([
      'bot.ts',
      '--no-headful',
    ])
  })

  test('does not normalize positional inputs after --', () => {
    expect(normalizeCliAliases(['bot.ts', '--', '--gui'])).toEqual([
      'bot.ts',
      '--',
      '--gui',
    ])
  })
})

describe('parseTimeout', () => {
  test('accepts a non-negative integer', () => {
    expect(parseTimeout('0')).toBe(0)
    expect(parseTimeout('30000')).toBe(30000)
  })

  test.each(['-1', '1.5', 'nope'])('rejects invalid timeout %s', timeout => {
    expect(() => parseTimeout(timeout)).toThrow('non-negative integer')
  })
})

describe('shouldNormalizeInputRules', () => {
  const argsDefinition = {
    'no-normalize': {
      type: 'boolean',
      alias: 'n',
      default: false,
    },
  } as const

  test('normalizes by default', () => {
    expect(shouldNormalizeInputRules(parseArgs([], argsDefinition))).toBe(true)
  })

  test.each([['--no-normalize'], ['-n']])(
    'disables normalization with %s',
    rawArg => {
      expect(
        shouldNormalizeInputRules(parseArgs([rawArg], argsDefinition))
      ).toBe(false)
    }
  )
})

describe('validateInput', () => {
  test('requires a non-empty value', () => {
    expect(validateInput('  ', { pattern: '.*' })).toBe(
      'This field is required.'
    )
  })

  test('uses pattern flags from the config', () => {
    expect(
      validateInput('HTTPS://example.com', { pattern: '^https://', flags: 'i' })
    ).toBeUndefined()
    expect(
      validateInput('ftp://example.com', { pattern: '^https://' })
    ).toContain('required format')
  })

  test('includes the regular expression error for an invalid config rule', () => {
    const error = validateInput('value', { pattern: '[' })

    expect(error).toContain('invalid regular expression')
    expect(error).not.toBe('The config contains an invalid regular expression.')
  })
})

describe('collectPositionalInputs', () => {
  const entries: [string, { pattern: string }][] = [
    ['url', { pattern: '^https://' }],
    ['token', { pattern: '^.{2,}$' }],
  ]

  test('maps values in config declaration order', () => {
    expect(collectPositionalInputs(entries, ['https://example.com'])).toEqual({
      url: 'https://example.com',
    })
    expect(
      collectPositionalInputs(entries, ['https://example.com', 'T1'])
    ).toEqual({ url: 'https://example.com', token: 'T1' })
  })

  test('validates provided values', () => {
    expect(() =>
      collectPositionalInputs(entries, ['ftp://example.com'])
    ).toThrow('Input "url"')
  })

  test('rejects values beyond the configured inputs', () => {
    expect(() =>
      collectPositionalInputs(entries, ['https://example.com', 'T1', 'extra'])
    ).toThrow('Expected at most 2 input arguments, received 3')
  })
})

describe('renderLogs', () => {
  const log = JSON.stringify({
    time: 0,
    level: 'error',
    prefix: 'challenge',
    line: 'failed to visit',
    extra: {
      id: 'T1',
      url: 'https://example.com',
      stack: 'Error: failed to visit\n    at handler (bot.ts:10:3)',
    },
  })

  test('renders the main log fields by default', () => {
    const output = stripVTControlCharacters(renderLogs(log))

    expect(output).toContain('[T1 challenge]')
    expect(output).toContain('failed to visit')
    expect(output).toContain('T1')
    expect(output).not.toContain('id:')
    expect(output).not.toContain('url:')
    expect(output).not.toContain('stack:')
  })

  test('renders structured details in verbose mode', () => {
    const output = stripVTControlCharacters(renderLogs(log, true))

    expect(output).toContain('[T1 challenge]')
    expect(output).not.toContain('id:')
    expect(output).toContain('url:')
    expect(output).toContain('https://example.com')
    expect(output).toContain('stack:')
    expect(output).toContain('\n    at handler (bot.ts:10:3)')
  })
})
