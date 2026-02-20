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
  restrictedDomains: RestrictedDomainsConfig
): string => {
  let regexCounter = 0
  let preamble = ''
  let body = ''

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

  // Evaluation order: host.allow -> host.disallow -> url.allow -> url.disallow -> DIRECT.
  // Within a scope, allow wins over disallow. Across scopes, host takes priority over url.
  processRules('host', restrictedDomains.host)
  processRules('url', restrictedDomains.url)

  body += '\n  return "DIRECT";'

  return preamble + 'function FindProxyForURL(url, host) {' + body + '\n}'
}
