import type { MetaFile } from '@/types'

export default {
  label: 'Challenges',
  scrollable: true,
  collapsed: false,
  items: {
    list: { order: 1 },
    solves: { order: 2 },
    submit: { order: 3 },
    'submit-dynamic-scores': { order: 4 },
  },
} satisfies MetaFile
