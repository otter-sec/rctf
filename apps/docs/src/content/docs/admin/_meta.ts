import type { MetaFile } from '@/types'

export default {
  label: 'Administration',
  items: {
    challenges: { label: 'Challenges', order: 1 },
    scoring: { label: 'Scoring', order: 2, badge: 'new' },
    teams: { label: 'Teams', order: 3 },
    submissions: { label: 'Submissions', order: 4 },
    uploading: { label: 'Uploading', order: 5 },
    markdown: { label: 'Markdown', order: 6, badge: 'new' },
  },
} satisfies MetaFile
