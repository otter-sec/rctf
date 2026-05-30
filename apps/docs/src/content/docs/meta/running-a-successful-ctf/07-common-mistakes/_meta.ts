import type { MetaFile } from '@/types'

export default {
  label: 'Common mistakes',
  badge: 'new',
  collapsed: true,
  items: {
    infrastructure: { label: 'Infrastructure', order: 1 },
    challenges: { label: 'Challenges', order: 2 },
  },
} satisfies MetaFile
