import type { MetaFile } from '@/types'

export default {
  label: 'Instancer',
  collapsed: true,
  items: {
    index: { label: 'Overview', order: 0 },
    docker: { label: 'Docker instancer', order: 1, badge: 'new' },
    kubernetes: { label: 'Kubernetes instancer', order: 2, badge: 'new' },
  },
} satisfies MetaFile
