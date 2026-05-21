import type { MetaFile } from '@/types'

export default {
  label: 'Meta',
  items: {
    'running-a-successful-ctf': {
      label: 'Running a successful CTF',
      order: 1,
    },
    'things-we-will-not-implement': {
      label: 'Things we will not implement',
      order: 2,
      badge: 'new',
    },
  },
} satisfies MetaFile
