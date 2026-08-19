import { cp, rm } from 'node:fs/promises'
import path from 'node:path'

const root = import.meta.dir
const outdir = path.join(root, 'dist')

await rm(outdir, { recursive: true, force: true })

const result = await Bun.build({
  entrypoints: [path.join(root, 'src/index.ts')],
  outdir,
  target: 'bun',
  minify: true,
  sourcemap: 'linked',
  splitting: true,
})
if (!result.success) {
  console.error(...result.logs)
  process.exit(1)
}

await cp(
  path.join(root, '../api/src/cache/scripts'),
  path.join(outdir, 'scripts'),
  { recursive: true }
)
