export const defaultMaxLogLines = 64
export const defaultMaxLogParamChars = 2048

export const defaultChromeArguments: string[] = [
  // TODO(es3n1n): review to make sure we're disabling what's needed
  '--no-sandbox',
  '--disable-jit',
  '--disable-wasm',
  '--disable-dev-shm-usage',
  // --disable-gpu is deprecated and is no longer required
]

export const defaultFirefoxArguments: string[] = [
  // apparently, most security configurations are done via preferences
  // but leaving this just for consistency
]

export const defaultFirefoxPreferences: Record<string, unknown> = {
  // TODO(es3n1n): Do we need to disable anything else, other than this?
  'javascript.options.wasm': false,
  'javascript.options.ion': false,
  'javascript.options.baselinejit': false,
  'javascript.options.wasm_baselinejit': false,
  'security.sandbox.content.level': 0,
}
