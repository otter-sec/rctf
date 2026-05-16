import type { MetaFile } from '@/types'

export default {
  label: 'Installation',
  collapsed: true,
  items: {
    manual: { label: 'Manual', order: 1 },
    upgrading: { label: 'Upgrading from v1', order: 2 },
    architecture: { label: 'Production architecture', order: 3, badge: 'new' },
    scaling: { label: 'Scaling', order: 4, badge: 'new' },
  },
} satisfies MetaFile
