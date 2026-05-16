import type { MetaFile } from '@/types'

export default {
  label: 'Instancer',
  collapsed: true,
  items: {
    docker: { label: 'Docker instancer', order: 1, badge: 'new' },
    kubernetes: { label: 'Kubernetes instancer', order: 2, badge: 'new' },
  },
} satisfies MetaFile
