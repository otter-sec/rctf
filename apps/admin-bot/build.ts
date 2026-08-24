import { buildApp } from '@rctf/build'

await buildApp({
  root: import.meta.dir,
  entrypoints: ['src/index.ts'],
  runtimePackage: true,
  // prewarm.sh runs this from node_modules
  extraRuntimeDeps: ['@puppeteer/browsers'],
})
