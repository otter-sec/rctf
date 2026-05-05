import type { MetaFile } from '@/types'

export default {
  label: 'API reference',
  collapsed: true,
  items: {
    index: { label: 'Overview', order: 0 },
    challenges: { label: 'Challenges', order: 1 },
    leaderboard: { label: 'Leaderboard', order: 2 },
    users: { label: 'Users', order: 3 },
    admin: { label: 'Admin', order: 4 },
  },
} satisfies MetaFile
