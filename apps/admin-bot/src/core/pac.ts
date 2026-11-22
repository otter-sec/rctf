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

export const buildPac = (
  restrictedDomains: RestrictedDomainsConfig,
  directOrigins: string[] = []
): string => {
  let regexCounter = 0
  let preamble = ''
  let body = ''

  const normalizedDirectOrigins = new Set<string>()
  for (const value of directOrigins) {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Direct PAC origins must use HTTP or HTTPS')
    }
    normalizedDirectOrigins.add(url.origin)

    url.protocol = url.protocol === 'http:' ? 'ws:' : 'wss:'
    normalizedDirectOrigins.add(url.origin)
  }

  for (const origin of normalizedDirectOrigins) {
    body += `\n  if (url === ${JSON.stringify(origin)} || url.indexOf(${JSON.stringify(`${origin}/`)}) === 0 || url.indexOf(${JSON.stringify(`${origin}?`)}) === 0 || url.indexOf(${JSON.stringify(`${origin}#`)}) === 0) return "DIRECT";`
  }

  const makeRegex = (rule: RegexRule): string => {
    const flags = rule.flags ? `, ${JSON.stringify(rule.flags)}` : ''
    return `new RegExp(${JSON.stringify(rule.pattern)}${flags})`
  }

  const processRules = (key: string, set?: AllowDisallowSet): void => {
    for (const rule of set?.allowRegex ?? []) {
      const varName = `_r${regexCounter++}`
      preamble += `const ${varName} = ${makeRegex(rule)};\n`
      body += `\n  if (${varName}.test(${key})) return "DIRECT";`
    }

    for (const rule of set?.disallowRegex ?? []) {
      const varName = `_r${regexCounter++}`
      preamble += `const ${varName} = ${makeRegex(rule)};\n`
      body += `\n  if (${varName}.test(${key})) return "PROXY 127.0.0.1:1";`
    }
  }

  // Evaluation order: direct origins -> host.allow -> host.disallow -> url.allow -> url.disallow -> DIRECT.
  // Within a scope, allow wins over disallow. Across scopes, host takes priority over url.
  processRules('host', restrictedDomains.host)
  processRules('url', restrictedDomains.url)

  body += '\n  return "DIRECT";'

  return preamble + 'function FindProxyForURL(url, host) {' + body + '\n}'
}
