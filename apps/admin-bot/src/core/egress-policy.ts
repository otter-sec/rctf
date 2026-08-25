import ipaddr from 'ipaddr.js'

export interface RegexRule {
  pattern: string
  flags?: string
}

export interface AllowDisallowSet {
  allowRegex?: RegexRule[]
  disallowRegex?: RegexRule[]
}

export interface RestrictedDomainsConfig {
  url?: AllowDisallowSet
  host?: AllowDisallowSet
}

export interface PolicyDecision {
  action: 'allow' | 'deny'
  reason: string
}

type Address = ipaddr.IPv4 | ipaddr.IPv6
type Cidr = [Address, number]
type Scope = 'host' | 'url'
type Rule = PolicyDecision & { scope: Scope; regex: RegExp }

const invalidHostname = (): never => {
  throw new Error('invalid hostname')
}

// ipaddr.js interprets dotted IPv6 tails as mapped IPv4. WHATWG URL parsing
// preserves their actual IPv6 value (for example ::8.8.8.8 -> ::808:808).
const normalizeDottedIpv6 = (input: string): string => {
  if (!input.includes(':') || !input.includes('.')) return input
  try {
    return new URL(`http://[${input}]/`).hostname.slice(1, -1)
  } catch {
    return input
  }
}

export const canonicalizeHostname = (input: string): string => {
  let hostname = input
  if (hostname.startsWith('[') || hostname.endsWith(']')) {
    if (!hostname.startsWith('[') || !hostname.endsWith(']')) invalidHostname()
    hostname = hostname.slice(1, -1)
  }
  if (!hostname || hostname.includes('%')) invalidHostname()

  const address = normalizeDottedIpv6(hostname)
  if (ipaddr.isValid(address)) return ipaddr.parse(address).toString()

  hostname = hostname.toLowerCase()
  if (hostname.endsWith('.')) hostname = hostname.slice(0, -1)
  if (!hostname || hostname.endsWith('.') || hostname.includes(':'))
    invalidHostname()

  let url: URL
  try {
    url = new URL(`http://${hostname}/`)
  } catch {
    return invalidHostname()
  }
  if (
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    invalidHostname()
  }

  hostname = url.hostname.toLowerCase()
  if (
    hostname.length > 253 ||
    hostname
      .split('.')
      .some(
        label =>
          !label ||
          label.length > 63 ||
          !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
      )
  ) {
    invalidHostname()
  }
  return hostname
}

const compile = (config: RestrictedDomainsConfig): Rule[] =>
  (['host', 'url'] as const).flatMap(scope =>
    (
      [
        ['allow', 'allowRegex'],
        ['deny', 'disallowRegex'],
      ] as const
    ).flatMap(([action, key]) =>
      (config[scope]?.[key] ?? []).map(rule => ({
        action,
        scope,
        reason: `domain-${scope}-${action === 'allow' ? 'allow' : 'disallow'}`,
        regex: new RegExp(rule.pattern, rule.flags),
      }))
    )
  )

export class DomainPolicy {
  private readonly rules: Rule[]

  constructor(config: RestrictedDomainsConfig = {}) {
    this.rules = compile(config)
  }

  evaluate(hostname: string, url: string): PolicyDecision {
    for (const rule of this.rules) {
      rule.regex.lastIndex = 0
      if (rule.regex.test(rule.scope === 'host' ? hostname : url)) return rule
    }
    return { action: 'allow', reason: 'domain-default-allow' }
  }
}

const parseCidr = (cidr: string, option: string): Cidr => {
  try {
    const slash = cidr.lastIndexOf('/')
    const address = slash < 0 ? cidr : cidr.slice(0, slash)
    return ipaddr.parseCIDR(
      `${normalizeDottedIpv6(address)}${slash < 0 ? '' : cidr.slice(slash)}`
    ) as Cidr
  } catch {
    throw new Error(`Invalid CIDR in ${option}: ${cidr}`)
  }
}

const matches = (address: Address, [network, prefix]: Cidr) =>
  address.kind() === network.kind() && address.match(network, prefix)
const ipv4Compatible = ipaddr.parseCIDR('::/96') as Cidr

export interface IpPolicyOptions {
  allowPrivateCidrs?: string[]
  denyCidrs?: string[]
}

export class IpPolicy {
  private readonly allow: Cidr[]
  private readonly deny: Cidr[]

  constructor(options: IpPolicyOptions = {}) {
    this.allow = (options.allowPrivateCidrs ?? []).map(cidr =>
      parseCidr(cidr, 'allowPrivateCidrs')
    )
    this.deny = (options.denyCidrs ?? []).map(cidr =>
      parseCidr(cidr, 'denyCidrs')
    )
  }

  evaluate(input: string): PolicyDecision {
    let original: Address
    let address: Address
    try {
      const normalized = normalizeDottedIpv6(input)
      original = ipaddr.parse(normalized)
      address = ipaddr.process(normalized)
    } catch {
      return { action: 'deny', reason: 'ip-invalid' }
    }

    const inCidr = (cidr: Cidr) =>
      matches(original, cidr) || matches(address, cidr)
    if (this.deny.some(inCidr))
      return { action: 'deny', reason: 'ip-deny-cidr' }
    if (this.allow.some(inCidr)) {
      return { action: 'allow', reason: 'ip-allow-private-cidr' }
    }
    if (matches(original, ipv4Compatible)) {
      return { action: 'deny', reason: 'ip-ipv4-compatible' }
    }

    const range = address.range()
    return range === 'unicast'
      ? { action: 'allow', reason: 'ip-public-unicast' }
      : { action: 'deny', reason: `ip-${range}` }
  }
}
