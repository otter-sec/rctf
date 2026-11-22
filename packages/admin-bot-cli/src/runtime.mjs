import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)

/**
 * @param {NodeJS.Platform} platform
 * @param {string} architecture
 * @param {boolean} isMusl
 */
export const runtimePackageName = (platform, architecture, isMusl = false) => {
  const packagePlatform = platform === 'win32' ? 'windows' : platform
  const packageArchitecture =
    architecture === 'arm64' ? 'aarch64' : architecture
  return `@oven/bun-${packagePlatform}-${packageArchitecture}${isMusl ? '-musl' : ''}`
}

export const resolveBun = () => {
  /** @type {{ header?: { glibcVersionRuntime?: string } } | undefined} */
  const report = process.report?.getReport()
  const isMusl =
    process.platform === 'linux' &&
    (!report?.header?.glibcVersionRuntime || existsSync('/etc/alpine-release'))
  const packageName = runtimePackageName(process.platform, process.arch, isMusl)
  return join(
    dirname(require.resolve(`${packageName}/package.json`)),
    'bin',
    process.platform === 'win32' ? 'bun.exe' : 'bun'
  )
}
