import type { MetaFile } from '@/types'

export default {
  label: 'Authentication',
  scrollable: true,
  collapsed: false,
  items: {
    register: { order: 1 },
    verify: { order: 2 },
    recover: { order: 3 },
    'verify-info': { order: 4 },
    login: { order: 5 },
    test: { order: 6 },
  },
} satisfies MetaFile
