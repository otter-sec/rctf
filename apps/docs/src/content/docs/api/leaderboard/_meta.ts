import type { MetaFile } from '@/types'

export default {
  label: 'Leaderboard',
  scrollable: true,
  collapsed: false,
  items: {
    now: { order: 1 },
    'with-graph': { order: 2 },
    graph: { order: 3 },
    challs: { order: 4 },
  },
} satisfies MetaFile
