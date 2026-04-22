import type { MetaFile } from '@/types'

export default {
  label: 'Providers',
  collapsed: true,
  items: {
    index: { label: 'Overview', order: 0 },
    captcha: { label: 'Captcha', order: 1 },
    emails: { label: 'Email', order: 2 },
    uploads: { label: 'Uploads', order: 3 },
    scores: { label: 'Scoring', order: 4 },
    moderation: { label: 'Moderation', order: 5 },
    analytics: { label: 'Analytics', order: 6 },
  },
} satisfies MetaFile
