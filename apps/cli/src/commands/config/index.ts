import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'config',
    description: 'Inspect the resolved configuration',
  },
  subCommands: {
    get: () => import('./get').then(m => m.default),
  },
})
