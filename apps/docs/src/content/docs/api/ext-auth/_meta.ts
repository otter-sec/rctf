import type { MetaFile } from '@/types'

export default {
  label: 'External auth',
  scrollable: true,
  collapsed: false,
  items: {
    'get-client': { order: 1 },
    authorize: { order: 2 },
    token: { order: 3 },
  },
} satisfies MetaFile
