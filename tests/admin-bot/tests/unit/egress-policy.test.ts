import { describe, expect, test } from 'bun:test'
import {
  canonicalizeHostname,
  DomainPolicy,
  IpPolicy,
  type RestrictedDomainsConfig,
} from '../../../../apps/admin-bot/src/core/egress-policy'

const r = (pattern: string, flags?: string) => ({ pattern, flags })

const decide = (
  config: RestrictedDomainsConfig,
  host: string,
  url = `http://${host}/`
) => new DomainPolicy(config).evaluate(host, url).action

describe('DomainPolicy', () => {
  test('preserves host allow, host deny, URL allow, URL deny precedence', () => {
    const config: RestrictedDomainsConfig = {
      host: {
        allowRegex: [r('^allow-host$')],
        disallowRegex: [r('host')],
      },
      url: {
        allowRegex: [r('/allow-url')],
        disallowRegex: [r('deny')],
      },
    }

    expect(decide(config, 'allow-host', 'http://allow-host/deny')).toBe('allow')
    expect(decide(config, 'other-host', 'http://other-host/allow-url')).toBe(
      'deny'
    )
    expect(decide(config, 'neutral', 'http://neutral/allow-url/deny')).toBe(
      'allow'
    )
    expect(decide(config, 'neutral', 'http://neutral/deny')).toBe('deny')
    expect(decide(config, 'neutral')).toBe('allow')
  })

  test('preserves regexp flags and resets global and sticky lastIndex', () => {
    const global = new DomainPolicy({
      host: { disallowRegex: [r('example', 'gi')] },
    })
    expect(global.evaluate('EXAMPLE', 'http://example/').action).toBe('deny')
    expect(global.evaluate('EXAMPLE', 'http://example/').action).toBe('deny')

    const sticky = new DomainPolicy({
      host: { disallowRegex: [r('example', 'y')] },
    })
    expect(sticky.evaluate('example', 'http://example/').action).toBe('deny')
    expect(sticky.evaluate('example', 'http://example/').action).toBe('deny')
  })
})

describe('canonicalizeHostname', () => {
  test('normalizes DNS case, one root dot, IPv6 brackets, and unusual IPv4', () => {
    expect(canonicalizeHostname('Example.COM.')).toBe('example.com')
    expect(canonicalizeHostname('[2001:DB8::1]')).toBe('2001:db8::1')
    expect(canonicalizeHostname('[::8.8.8.8]')).toBe('::808:808')
    expect(canonicalizeHostname('0177.0.0.1')).toBe('127.0.0.1')
  })

  test('rejects zone identifiers and invalid hostnames', () => {
    expect(() => canonicalizeHostname('[fe80::1%25eth0]')).toThrow()
    expect(() => canonicalizeHostname('bad..example')).toThrow()
    expect(() => canonicalizeHostname('bad/name')).toThrow()
    expect(() => canonicalizeHostname('example.com..')).toThrow()
  })
})

describe('IpPolicy', () => {
  test.each([
    '0.0.0.0',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '192.0.2.1',
    '224.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    '::8.8.8.8',
    'fc00::1',
    'fe80::1',
    'ff02::1',
    '64:ff9b::7f00:1',
    '2002:0808:0808::1',
    '2001:0000:4136:e378:8000:63bf:3fff:fdd2',
  ])('denies special address %s', address => {
    expect(new IpPolicy().evaluate(address).action).toBe('deny')
  })

  test('allows public unicast IPv4 and IPv6', () => {
    const policy = new IpPolicy()
    expect(policy.evaluate('8.8.8.8').action).toBe('allow')
    expect(policy.evaluate('2606:4700:4700::1111').action).toBe('allow')
  })

  test('normalizes mapped IPv6 before policy evaluation', () => {
    const policy = new IpPolicy()
    expect(policy.evaluate('::ffff:127.0.0.1').action).toBe('deny')
    expect(policy.evaluate('::ffff:8.8.8.8').action).toBe('allow')

    const mappedOverride = new IpPolicy({
      allowPrivateCidrs: ['::ffff:127.0.0.1/128'],
    })
    expect(mappedOverride.evaluate('::ffff:127.0.0.1').action).toBe('allow')
  })

  test('applies deny before allow-private and allow-private before built-ins', () => {
    const policy = new IpPolicy({
      denyCidrs: ['10.1.0.0/16'],
      allowPrivateCidrs: ['10.0.0.0/8', '::1/128'],
    })
    expect(policy.evaluate('10.1.2.3')).toEqual({
      action: 'deny',
      reason: 'ip-deny-cidr',
    })
    expect(policy.evaluate('10.2.3.4')).toEqual({
      action: 'allow',
      reason: 'ip-allow-private-cidr',
    })
    expect(policy.evaluate('::1').action).toBe('allow')
  })

  test('rejects malformed CIDRs during construction', () => {
    expect(() => new IpPolicy({ denyCidrs: ['not-a-cidr'] })).toThrow(
      'Invalid CIDR'
    )
    expect(() => new IpPolicy({ allowPrivateCidrs: ['127.0.0.1/99'] })).toThrow(
      'Invalid CIDR'
    )
  })
})
