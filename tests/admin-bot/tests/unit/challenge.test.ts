import { describe, expect, test } from 'bun:test'
import type { RegexRule } from '../../../../apps/admin-bot/src/core/pac'
import { Challenge } from '../../../../apps/admin-bot/src/types'

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

describe('hooksConfig resolution', () => {
  test('defaults to everything disabled when hooksConfig is omitted', () => {
    const { hooksConfig: _hooksConfig, ...rest } = minimalConfig()
    const challenge = new Challenge(rest)
    expect(challenge.config.hooksConfig).toEqual({
      showConsoleLogs: false,
      showBrowserErrors: false,
      showNavigation: false,
      showDialogs: false,
      autoDismissDialogs: false,
      limitTabsNumber: -1,
      limitTabsNumberShowError: false,
    })
  })

  test('fills missing fields when hooksConfig is partial', () => {
    const challenge = new Challenge({
      ...minimalConfig(),
      hooksConfig: { showConsoleLogs: true, limitTabsNumber: 2 },
    })
    expect(challenge.config.hooksConfig).toEqual({
      showConsoleLogs: true,
      showBrowserErrors: false,
      showNavigation: false,
      showDialogs: false,
      autoDismissDialogs: false,
      limitTabsNumber: 2,
      limitTabsNumberShowError: false,
    })
  })
})
