import type { MetaFile } from '@/types'

export default {
  label: 'Running a successful CTF',
  items: {
    '01-prerequisites': { label: 'Prerequisites', order: 1 },
    '02-challenge-design': { label: 'Challenge design', order: 2 },
    '03-setup': { label: 'Setting up a CTF platform', order: 3 },
    '04-deployment': { label: 'Deploying challenges', order: 4 },
    '05-during-ctf': { label: 'During the CTF', order: 5 },
    '06-after-ctf': { label: 'After the CTF', order: 6 },
  },
} satisfies MetaFile
