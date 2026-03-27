export const defaultMaxLogLines = 64
export const defaultMaxLogParamChars = 2048

// TODO(es3n1n): We are disabling sandbox for chrome because in our deployments we do not support running with them.
// Chrome output:
// [content/browser/zygote_host/zygote_host_impl_linux.cc:128] No usable sandbox!
//  If you are running on Ubuntu 23.10+ or another Linux distro that has disabled unprivileged user namespaces with AppArmor,
//   see https://chromium.googlesource.com/chromium/src/+/main/docs/security/apparmor-userns-restrictions.md.
//  Otherwise see https://chromium.googlesource.com/chromium/src/+/main/docs/linux/suid_sandbox_development.md for more information on developing with the (older) SUID sandbox.
//  If you want to live dangerously and need an immediate workaround, you can try using --no-sandbox.

export const defaultChromeArguments: string[] = [
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
  'javascript.options.wasm': false,
  'javascript.options.ion': false,
  'javascript.options.baselinejit': false,
  'javascript.options.wasm_baselinejit': false,
}
