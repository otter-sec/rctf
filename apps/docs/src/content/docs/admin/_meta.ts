import type { MetaFile } from '@/types'

export default {
  label: 'Administration',
  items: {
    index: { label: 'Overview', order: 0 },
    challenges: { label: 'Challenges', order: 1 },
    teams: { label: 'Teams', order: 2 },
    submissions: { label: 'Submissions', order: 3 },
    uploading: { label: 'Uploading', order: 4 },
    markdown: { label: 'Markdown', order: 5, badge: 'new' },
  },
} satisfies MetaFile
