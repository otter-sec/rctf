import type { MetaFile } from '@/types'

export default {
  label: 'Integrations',
  collapsed: true,
  items: {
    index: { label: 'Overview', order: 0 },
    ctftime: { label: 'CTFtime', order: 1 },
    instancer: { label: 'Instancer', order: 2 },
    bloodbot: { label: 'Blood bot', order: 3 },
  },
} satisfies MetaFile
