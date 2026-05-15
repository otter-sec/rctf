import type { MetaFile } from '@/types'

export default {
  label: 'Integrations',
  collapsed: true,
  items: {
    index: { label: 'Overview', order: 0 },
    ctftime: { label: 'CTFtime', order: 1 },
    instancer: { order: 2 },
    'admin-bot': { label: 'Admin bot', order: 3, badge: 'new' },
    bloodbot: { label: 'Blood bot', order: 4 },
    konata: { label: 'Konata', order: 5, badge: 'new' },
  },
} satisfies MetaFile
