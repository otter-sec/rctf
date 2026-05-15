import type { MetaFile } from '@/types'

export default {
  label: 'API reference',
  collapsed: true,
  scrollable: true,
  items: {
    index: { label: 'Overview', order: 0 },
    auth: { label: 'Authentication', order: 1, badge: 'new' },
    challenges: { label: 'Challenges', order: 2 },
    leaderboard: { label: 'Leaderboard', order: 3 },
    users: { label: 'Users', order: 4 },
    admin: { label: 'Admin', order: 5 },
    integrations: { label: 'Integrations', order: 6, badge: 'new' },
    responses: { label: 'Responses', order: 7, badge: 'new' },
  },
} satisfies MetaFile
