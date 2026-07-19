import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'deployment',
    description: 'Deployment-related commands',
  },
  subCommands: {
    'generate-csp': () => import('./generate-csp').then(m => m.default),
  },
})
