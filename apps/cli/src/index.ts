#!/usr/bin/env bun
import { defineCommand, runMain } from 'citty'

const main = defineCommand({
  meta: {
    name: 'rctf',
    description: 'rCTF CLI',
  },
  subCommands: {
    deployment: () => import('./commands/deployment').then(m => m.default),
    user: () => import('./commands/user').then(m => m.default),
    seed: () => import('./commands/seed').then(m => m.default),
    export: () => import('./commands/export').then(m => m.default),
  },
})

runMain(main)
