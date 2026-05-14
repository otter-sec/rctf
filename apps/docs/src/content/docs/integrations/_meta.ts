import type { MetaFile } from '@/types'

export default {
  label: 'Integrations',
  collapsed: true,
  items: {
    index: { label: 'Overview', order: 0 },
    ctftime: { label: 'CTFtime', order: 1 },
    instancer: { label: 'Instancer', order: 2 },
    'admin-bot': { label: 'Admin bot', order: 3 },
    bloodbot: { label: 'Blood bot', order: 4 },
  },
} satisfies MetaFile
