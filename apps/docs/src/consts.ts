import type { DocsConfig, IconMap, Site, SocialLink } from '@/types'

export const SITE: Site = {
  title: 'rCTF Docs',
  description:
    "rCTF is redpwn's CTF platform. It is now developed and maintained by the OtterSec team.",
  href: 'https://rctf.osec.io',
  author: 'otter-sec',
  locale: 'en-US',
}

export const SOCIAL_LINKS: SocialLink[] = [
  { href: 'https://github.com/otter-sec', label: 'GitHub' },
  { href: 'https://twitter.com/osec_io', label: 'Twitter' },
]

export const ICON_MAP: IconMap = {
  Website: 'lucide:globe',
  GitHub: 'lucide:github',
  LinkedIn: 'lucide:linkedin',
  Twitter: 'lucide:twitter',
  Email: 'lucide:mail',
  RSS: 'lucide:rss',
  Discord: 'lucide:message-circle',
}

export const DOCS: DocsConfig = {
  repoUrl: 'https://github.com/otter-sec/rctf',
  editUrlBase:
    'https://github.com/otter-sec/rctf/edit/main/apps/docs/src/content/docs/',
  defaultEditUrl: true,
  defaultLastUpdated: true,
  defaultTableOfContents: { minDepth: 2, maxDepth: 4 },
  search: {
    enabled: true,
    hotkey: { mac: '⌘ K', windows: 'Ctrl K' },
  },
  announcement: null,
}
