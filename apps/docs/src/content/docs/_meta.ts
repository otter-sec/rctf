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
    meta: { label: 'Meta', order: 8 },
    archiving: { label: 'Archiving', order: 9, badge: 'new' },
  },
} satisfies MetaFile
