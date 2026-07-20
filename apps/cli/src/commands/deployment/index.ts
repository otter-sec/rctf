import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'deployment',
    description: 'Deployment-related commands',
  },
  subCommands: {
    'generate-csp': () => import('./generate-csp').then(m => m.default),
    'generate-avatar-body-limit': () =>
      import('./generate-avatar-body-limit').then(m => m.default),
  },
})
