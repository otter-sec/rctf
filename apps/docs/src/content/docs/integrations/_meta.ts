import type { MetaFile } from '@/types'

export default {
  label: 'Integrations',
  collapsed: true,
  items: {
    index: { label: 'Overview', order: 0 },
    ctftime: { label: 'CTFtime', order: 1 },
    instancer: { label: 'Instancer', order: 2 },
    'k8s-instancer': { label: 'Kubernetes instancer', order: 3 },
    'admin-bot': { label: 'Admin bot', order: 4 },
    bloodbot: { label: 'Blood bot', order: 5 },
  },
} satisfies MetaFile
