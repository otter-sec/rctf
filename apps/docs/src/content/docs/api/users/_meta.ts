import type { MetaFile } from '@/types'

export default {
  label: 'Users',
  scrollable: true,
  collapsed: false,
  items: {
    profile: { order: 1 },
    self: { order: 2 },
    update: { order: 3 },
    avatar: { order: 4 },
    email: { order: 5 },
    'delete-email': { order: 6 },
    ctftime: { order: 7 },
    'delete-ctftime': { order: 8 },
    members: { order: 9 },
    'create-member': { order: 10 },
    'delete-member': { order: 11 },
  },
} satisfies MetaFile
