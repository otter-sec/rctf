import { spawnSync } from 'node:child_process'
import { resolveBun } from '../src/runtime.mjs'

const result = spawnSync(resolveBun(), process.argv.slice(2), {
  stdio: 'inherit',
})
if (result.error) throw result.error
process.exitCode = result.status ?? 1
