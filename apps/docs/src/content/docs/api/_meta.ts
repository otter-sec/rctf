import type { MetaFile } from '@/types'

export default {
  label: 'API reference',
  collapsed: true,
  items: {
    auth: { label: 'Authentication', order: 10, badge: 'new', collapsed: false },
    challenges: { label: 'Challenges', order: 11, collapsed: false },
    leaderboard: { label: 'Leaderboard', order: 12 },
    users: { label: 'Users', order: 13 },
    admin: { label: 'Admin', order: 14 },
    integrations: { label: 'Integrations', order: 15, badge: 'new' },
    'ext-auth': { label: 'External auth', order: 16, badge: 'new' },
    responses: { label: 'Responses', order: 17, badge: 'new' },
  },
} satisfies MetaFile
