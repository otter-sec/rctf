import { buildApp } from '@rctf/build'

await buildApp({
  root: import.meta.dir,
  entrypoints: ['src/index.ts'],
  copy: { '../api/src/cache/scripts': 'scripts' },
})
