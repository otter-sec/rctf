#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolveBun } from './runtime.mjs'

let bun
try {
  bun = resolveBun()
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error)
  console.error(
    `The bundled Bun runtime is unavailable for ${process.platform}-${process.arch}. Reinstall without omitting optional dependencies.\n${detail}`
  )
  process.exit(1)
}
const cli = fileURLToPath(new URL('./cli.js', import.meta.url))

const child = spawn(bun, [cli, ...process.argv.slice(2)], {
  stdio: 'inherit',
  windowsHide: false,
})
/** @param {NodeJS.Signals} signal */
const forwardSignal = signal => child.kill(signal)
const removeSignalHandlers = () => {
  process.off('SIGINT', forwardSignal)
  process.off('SIGTERM', forwardSignal)
}
process.on('SIGINT', forwardSignal)
process.on('SIGTERM', forwardSignal)

child.once('error', error => {
  removeSignalHandlers()
  console.error(`Unable to start the bundled Bun runtime: ${error.message}`)
  process.exitCode = 1
})

child.once('exit', (code, signal) => {
  removeSignalHandlers()
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exitCode = code ?? 1
})
