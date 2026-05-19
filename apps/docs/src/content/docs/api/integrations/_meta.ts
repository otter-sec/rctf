import type { MetaFile } from '@/types'

export default {
  label: 'Integrations',
  scrollable: true,
  collapsed: false,
  items: {
    'client-config': { order: 1 },
    'analytics-script': { order: 2 },
    'instance-status': { order: 3 },
    'instance-start': { order: 4 },
    'instance-extend': { order: 5 },
    'instance-stop': { order: 6 },
    'admin-bot-config': { order: 7 },
    'admin-bot-submit': { order: 8 },
    'admin-bot-status': { order: 9 },
    'admin-bot-history': { order: 10 },
    'admin-bot-logs': { order: 11 },
    'ctftime-callback': { order: 12 },
    'ctftime-leaderboard': { order: 13 },
  },
} satisfies MetaFile
