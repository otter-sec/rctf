import { describe, expect, test } from 'bun:test'
import { buildPac } from '../../../../apps/admin-bot/src/core/pac'
import type { RestrictedDomainsConfig } from '../../../../apps/admin-bot/src/core/pac'

const evalPac = (
  config: RestrictedDomainsConfig
): ((url: string, host: string) => string) => {
  const code = buildPac(config)
  return new Function(`${code}\nreturn FindProxyForURL;`)() as (
    url: string,
    host: string
  ) => string
}

const r = (pattern: string, flags?: string) => ({ pattern, flags })

describe('buildPac', () => {
  test('generates valid PAC function', () => {
    const pac = buildPac({})
    expect(pac).toContain('function FindProxyForURL(url, host)')
  })

  test('allows everything when no rules are set', () => {
    const fn = evalPac({})
    expect(fn('http://anything.com', 'anything.com')).toBe('DIRECT')
  })

  test('host allow takes priority over host disallow', () => {
    const fn = evalPac({
      host: {
        allowRegex: [r('^www\\.example\\.com$')],
        disallowRegex: [r('^.*\\.example\\.com$')],
      },
    })
    expect(fn('http://www.example.com', 'www.example.com')).toBe('DIRECT')
    expect(fn('http://evil.example.com', 'evil.example.com')).toBe(
      'PROXY 127.0.0.1:1'
    )
  })

  test('blocks matching hosts', () => {
    const fn = evalPac({
      host: { disallowRegex: [r('\\.example\\.com$')] },
    })
    expect(fn('http://sub.example.com', 'sub.example.com')).toBe(
      'PROXY 127.0.0.1:1'
    )
    expect(fn('http://other.com', 'other.com')).toBe('DIRECT')
  })

  test('url allow and disallow', () => {
    const fn = evalPac({
      url: {
        allowRegex: [r('example\\.com/safe')],
        disallowRegex: [r('example\\.com')],
      },
    })
    expect(fn('http://example.com/safe', 'example.com')).toBe('DIRECT')
    expect(fn('http://example.com/evil', 'example.com')).toBe(
      'PROXY 127.0.0.1:1'
    )
  })

  test('host rules are evaluated before url rules', () => {
    const fn = evalPac({
      host: { disallowRegex: [r('^evil\\.com$')] },
      url: { allowRegex: [r('evil\\.com/ok')] },
    })
    // Host disallow fires first, before url allow can match
    expect(fn('http://evil.com/ok', 'evil.com')).toBe('PROXY 127.0.0.1:1')
  })

  test('unrelated domains are not affected', () => {
    const fn = evalPac({
      host: { disallowRegex: [r('\\.example\\.com$')] },
    })
    expect(fn('http://google.com', 'google.com')).toBe('DIRECT')
  })

  test('handles patterns with special characters safely', () => {
    const fn = evalPac({
      host: { disallowRegex: [r('^evil"site\\.com$')] },
    })
    // The pattern itself won't match a real host, but it shouldn't break eval
    expect(fn('http://safe.com', 'safe.com')).toBe('DIRECT')
  })

  test('multiple rules across host and url', () => {
    const fn = evalPac({
      host: {
        allowRegex: [r('^cdn\\.example\\.com$')],
        disallowRegex: [r('\\.example\\.com$'), r('\\.evil\\.org$')],
      },
      url: {
        allowRegex: [r('/public/')],
        disallowRegex: [r('/admin/')],
      },
    })
    expect(fn('http://cdn.example.com', 'cdn.example.com')).toBe('DIRECT')
    expect(fn('http://api.example.com', 'api.example.com')).toBe(
      'PROXY 127.0.0.1:1'
    )
    expect(fn('http://x.evil.org', 'x.evil.org')).toBe('PROXY 127.0.0.1:1')
    expect(fn('http://safe.com/public/file', 'safe.com')).toBe('DIRECT')
    expect(fn('http://safe.com/admin/secret', 'safe.com')).toBe(
      'PROXY 127.0.0.1:1'
    )
    expect(fn('http://other.com/page', 'other.com')).toBe('DIRECT')
  })

  test('flags are passed to RegExp constructor', () => {
    const fn = evalPac({
      host: { disallowRegex: [r('^EXAMPLE\\.COM$', 'i')] },
    })
    expect(fn('http://example.com', 'example.com')).toBe('PROXY 127.0.0.1:1')
    expect(fn('http://EXAMPLE.COM', 'EXAMPLE.COM')).toBe('PROXY 127.0.0.1:1')
    expect(fn('http://other.com', 'other.com')).toBe('DIRECT')
  })
})
