import { readFileSync } from 'node:fs'
import { cp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const root = import.meta.dir
const outdir = path.join(root, 'dist')

await rm(outdir, { recursive: true, force: true })

const result = await Bun.build({
  entrypoints: [
    path.join(root, 'src/index.ts'),
    path.join(root, 'src/workers/leaderboard.ts'),
  ],
  outdir,
  target: 'bun',
  minify: true,
  sourcemap: 'linked',
  splitting: true,
  naming: { entry: '[name].[ext]' },
})
if (!result.success) {
  console.error(...result.logs)
  process.exit(1)
}

await cp(path.join(root, 'src/cache/scripts'), path.join(outdir, 'scripts'), {
  recursive: true,
})

// native packages declare os/cpu constraints or a node-gyp build
const isNative = (name: string, from: string): boolean => {
  let file: string
  try {
    file = createRequire(from).resolve(`${name}/package.json`)
  } catch {
    return false
  }

  const meta = JSON.parse(readFileSync(file, 'utf8'))
  return (
    Boolean(meta.os || meta.cpu || meta.gypfile) ||
    Object.keys(meta.optionalDependencies ?? {}).some(dep =>
      isNative(dep, file)
    )
  )
}

// only deps with native binaries can't be bundled and must stay installed
const pkg = await Bun.file(path.join(root, 'package.json')).json()
const runtimeDependencies = Object.fromEntries(
  Object.entries(pkg.dependencies).filter(([name]) =>
    isNative(name, path.join(root, 'package.json'))
  )
)
console.log('runtime deps:', Object.keys(runtimeDependencies).join(', '))

await Bun.write(
  path.join(outdir, 'runtime-package.json'),
  `${JSON.stringify({ dependencies: runtimeDependencies }, null, 2)}\n`
)
