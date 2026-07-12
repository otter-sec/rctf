import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'user',
    description: 'Manage users',
  },
  subCommands: {
    promote: () => import('./promote').then(m => m.default),
    demote: () => import('./demote').then(m => m.default),
    'list-admins': () => import('./list-admins').then(m => m.default),
  },
})
