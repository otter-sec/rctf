import type { MetaFile } from '@/types'

export default {
  items: {
    installation: { order: 1 },
    configuration: { label: 'Configuration', order: 2 },
    providers: { order: 3 },
    integrations: { order: 4 },
    admin: { label: 'Administration', order: 5 },
    api: { label: 'API reference', order: 6 },
    theming: { label: 'Theming and styling', order: 7, badge: 'new' },
    'running-a-successful-ctf': {
      label: 'Running a successful CTF',
      order: 8,
    },
    archiving: { label: 'Archiving', order: 9, badge: 'new' },
    'things-we-will-not-implement': {
      label: 'Things we will not implement',
      order: 10,
      badge: 'new',
    },
    glossary: { order: 11, badge: 'new' },
  },
} satisfies MetaFile
