import type { MetaFile } from '@/types'

export default {
  label: 'Installation',
  collapsed: true,
  items: {
    index: { label: 'Overview', order: 0 },
    manual: { label: 'Manual', order: 1 },
    upgrading: { label: 'Upgrading from v1', order: 2 },
  },
} satisfies MetaFile
