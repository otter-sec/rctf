import type { MetaFile } from '@/types'

export default {
  items: {
    installation: { order: 1 },
    configuration: { label: 'Configuration', order: 2 },
    providers: { order: 3 },
    integrations: { order: 4 },
    admin: { label: 'Administration', order: 5 },
    api: { label: 'API reference', order: 6 },
    theming: { label: 'Theming and styling', order: 7 },
    'running-a-successful-ctf': {
      label: 'Running a successful CTF',
      order: 8,
    },
  },
} satisfies MetaFile
