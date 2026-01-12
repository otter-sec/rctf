import { Glob } from 'bun'
import { dirname } from 'node:path'

const rootPackage = JSON.parse(await Bun.file('package.json').text())
const workspacePatterns = Array.isArray(rootPackage.workspaces)
  ? rootPackage.workspaces
  : Array.isArray(rootPackage.workspaces?.packages)
    ? rootPackage.workspaces.packages
    : []

const workspacePaths: string[] = []
const seen = new Set<string>()
const hasGlob = (pattern: string) => /[*?[\]{}()!]/.test(pattern)

for (const pattern of workspacePatterns) {
  const normalized = pattern.replace(/\/+$/, '')
  if (hasGlob(normalized)) {
    const glob = new Glob(`${normalized}/package.json`)
    for await (const match of glob.scan('.')) {
      const workspace = dirname(match)
      if (!seen.has(workspace)) {
        seen.add(workspace)
        workspacePaths.push(workspace)
      }
    }
  } else {
    const pkgPath = `${normalized}/package.json`
    const pkgFile = Bun.file(pkgPath)
    if (await pkgFile.exists()) {
      if (!seen.has(normalized)) {
        seen.add(normalized)
        workspacePaths.push(normalized)
      }
    }
  }
}

const buildTargets: string[] = []

for (const workspace of workspacePaths) {
  const pkgPath = `${workspace}/package.json`
  const pkgFile = Bun.file(pkgPath)
  if (!(await pkgFile.exists())) {
    continue
  }
  const pkgJson = JSON.parse(await pkgFile.text())
  if (pkgJson?.scripts?.build) {
    buildTargets.push(workspace)
  }
}

for (const workspace of buildTargets) {
  console.log(`==> build ${workspace}`)
  const proc = Bun.spawn(['bun', 'run', '--smol', 'build'], {
    cwd: workspace,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  })
  const exitCode = await proc.exited
  if (exitCode !== 0) {
    process.exit(exitCode)
  }
}
