import { buildApp } from '@rctf/build'

await buildApp({
  root: import.meta.dir,
  entrypoints: ['src/index.ts', 'src/workers/leaderboard.ts'],
  copy: { 'src/cache/scripts': 'scripts' },
  runtimePackage: true,
})
