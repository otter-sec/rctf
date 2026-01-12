import { Glob } from 'bun'

const rootPackage = JSON.parse(await Bun.file('package.json').text())
const workspacePatterns = Array.isArray(rootPackage.workspaces)
  ? rootPackage.workspaces
  : Array.isArray(rootPackage.workspaces?.packages)
    ? rootPackage.workspaces.packages
    : []

const workspacePaths: string[] = []
const seen = new Set<string>()

for (const pattern of workspacePatterns) {
  const glob = new Glob(pattern)
  for await (const match of glob.scan('.')) {
    if (!seen.has(match)) {
      seen.add(match)
      workspacePaths.push(match)
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
