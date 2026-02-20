import { describe, test, expect } from 'bun:test'
import { buildPac } from '../../../../apps/admin-bot/src/browser/manager'

describe('buildPac', () => {
  test('generates valid PAC function', () => {
    const pac = buildPac({ 'example.com': ['www.example.com'] })
    expect(pac).toContain('function FindProxyForURL(url, host)')
    expect(pac).toContain('return "DIRECT"')
  })

  test('allows explicitly listed subdomains via DIRECT', () => {
    const pac = buildPac({ 'example.com': ['www.example.com'] })
    expect(pac).toContain(
      'if (host.toLowerCase() == "www.example.com") return "DIRECT"'
    )
  })

  test('blocks parent domains via PROXY 127.0.0.1:1', () => {
    const pac = buildPac({ 'example.com': ['www.example.com'] })
    expect(pac).toContain(
      'if (host.toLowerCase().endsWith("example.com")) return "PROXY 127.0.0.1:1"'
    )
  })

  test('case-insensitive matching via toLowerCase', () => {
    const pac = buildPac({ 'Example.COM': ['WWW.Example.COM'] })
    expect(pac).toContain(
      'if (host.toLowerCase() == "www.example.com") return "DIRECT"'
    )
    expect(pac).toContain(
      'if (host.toLowerCase().endsWith("example.com")) return "PROXY 127.0.0.1:1"'
    )
  })

  test('handles multiple domains', () => {
    const pac = buildPac({
      'example.com': ['a.example.com', 'b.example.com'],
      'test.org': ['cdn.test.org'],
    })
    expect(pac).toContain('"a.example.com"')
    expect(pac).toContain('"b.example.com"')
    expect(pac).toContain('"cdn.test.org"')
    expect(pac).toContain('.endsWith("example.com")')
    expect(pac).toContain('.endsWith("test.org")')
  })

  test('handles empty input', () => {
    const pac = buildPac({})
    expect(pac).toContain('function FindProxyForURL(url, host)')
    expect(pac).toContain('return "DIRECT"')
    // Should not contain any PROXY lines
    expect(pac).not.toContain('PROXY')
  })
})
