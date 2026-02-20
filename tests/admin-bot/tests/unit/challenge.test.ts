import { describe, test, expect } from 'bun:test'
import { Challenge } from '../../../../apps/admin-bot/src/types'

const minimalConfig = (inputs: Record<string, string> = {}) => ({
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
        url: '^http(s?)://.*',
        flag: '^flag\\{[a-zA-Z0-9]+\\}$',
      })
    )
    expect(challenge.config.inputs.url).toBe('^http(s?)://.*')
    expect(challenge.config.inputs.flag).toBe('^flag\\{[a-zA-Z0-9]+\\}$')
  })

  test('throws on invalid regex with pattern and key name in error', () => {
    expect(
      () =>
        new Challenge(
          minimalConfig({
            badField: '[invalid(',
          })
        )
    ).toThrow(/\[invalid\(/)
    expect(
      () =>
        new Challenge(
          minimalConfig({
            badField: '[invalid(',
          })
        )
    ).toThrow(/badField/)
  })

  test('accepts empty inputs object', () => {
    const challenge = new Challenge(minimalConfig({}))
    expect(challenge.config.inputs).toEqual({})
  })
})
