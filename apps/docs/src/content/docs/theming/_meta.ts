import type { MetaFile } from '@/types'

export default {
  label: 'Theming and styling',
  collapsed: true,
  items: {
    colors: { label: 'Color system', order: 1 },
    categories: { label: 'Categories', order: 2 },
    components: { label: 'Components', order: 3 },
  },
} satisfies MetaFile
