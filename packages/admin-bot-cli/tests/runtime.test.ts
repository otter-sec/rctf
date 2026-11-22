import { describe, expect, test } from 'bun:test'
import { runtimePackageName } from '../src/runtime.mjs'

describe('bundled Bun runtime package', () => {
  test.each([
    ['win32', 'x64', false, '@oven/bun-windows-x64'],
    ['win32', 'arm64', false, '@oven/bun-windows-aarch64'],
    ['darwin', 'arm64', false, '@oven/bun-darwin-aarch64'],
    ['linux', 'x64', false, '@oven/bun-linux-x64'],
    ['linux', 'x64', true, '@oven/bun-linux-x64-musl'],
  ] as const)(
    'maps %s-%s (musl: %s)',
    (platform, architecture, musl, expected) => {
      expect(runtimePackageName(platform, architecture, musl)).toBe(expected)
    }
  )
})
