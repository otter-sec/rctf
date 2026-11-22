import { chmod, cp, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

const root = import.meta.dir
const outdir = join(root, 'dist')

await rm(outdir, { recursive: true, force: true })
await mkdir(outdir, { recursive: true })

const result = await Bun.build({
  entrypoints: [join(root, 'src/cli.ts')],
  outdir,
  target: 'bun',
  minify: true,
  sourcemap: 'linked',
  naming: { entry: 'cli.js' },
})

if (!result.success) {
  console.error(...result.logs)
  process.exit(1)
}

await cp(join(root, 'src/index.mjs'), join(outdir, 'index.mjs'))
await cp(join(root, 'src/runtime.mjs'), join(outdir, 'runtime.mjs'))
await chmod(join(outdir, 'index.mjs'), 0o755)
