import { describe, test, expect } from 'bun:test'
import { Challenge } from '../../../../apps/admin-bot/src/types'
import type { RegexRule } from '../../../../apps/admin-bot/src/core/pac'

const r = (pattern: string, flags?: string): RegexRule => ({ pattern, flags })

const minimalConfig = (inputs: Record<string, RegexRule> = {}) => ({
  timeoutMilliseconds: 5000,
  inputs,
  handler: async () => {},
  hooksConfig: {
    showConsoleLogs: false,
    showBrowserErrors: false,
    showNavigation: false,
    limitTabsNumber: -1,
  },
})

describe('Challenge constructor', () => {
  test('accepts valid regex patterns in inputs', () => {
    const challenge = new Challenge(
      minimalConfig({
        url: r('^http(s?)://.*'),
        flag: r('^flag\\{[a-zA-Z0-9]+\\}$'),
      })
    )
    expect(challenge.config.inputs.url.pattern).toBe('^http(s?)://.*')
    expect(challenge.config.inputs.flag.pattern).toBe(
      '^flag\\{[a-zA-Z0-9]+\\}$'
    )
  })

  test('throws on invalid regex with pattern and key name in error', () => {
    expect(
      () =>
        new Challenge(
          minimalConfig({
            badField: r('[invalid('),
          })
        )
    ).toThrow(/\[invalid\(/)
    expect(
      () =>
        new Challenge(
          minimalConfig({
            badField: r('[invalid('),
          })
        )
    ).toThrow(/badField/)
  })

  test('accepts empty inputs object', () => {
    const challenge = new Challenge(minimalConfig({}))
    expect(challenge.config.inputs).toEqual({})
  })
})
