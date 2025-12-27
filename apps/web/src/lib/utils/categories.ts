import {
  IconBinaryTreeFilled,
  IconBombFilled,
  IconCloudComputingFilled,
  IconCoinFilled,
  IconDice6Filled,
  IconEyeFilled,
  IconFlagFilled,
  IconKeyFilled,
  IconMicroscopeFilled,
  IconPuzzleFilled,
  IconChessQueenFilled,
  IconMoodHappyFilled,
  type IconComponent,
} from '$lib/icons'

export type CategoryConfig = {
  name: string
  icon: IconComponent
  /** Icon name for @iconify/svelte (renders full inline SVG for screenshot export) */
  iconName: string
  color: string
}

export const categoryOrder = [
  'sanity',
  'pwn',
  'reverse',
  'crypto',
  'forensics',
  'blockchain',
  'web',
  'misc',
  'ppc',
  'koth',
  'osint',
]

export const scoreboardCategoryOrder = [
  'pwn',
  'reverse',
  'crypto',
  'forensics',
  'blockchain',
  'web',
  'misc',
  'ppc',
  'koth',
  'osint',
  'sanity',
]

export const categoryAliases: Record<string, string> = {
  binary: 'pwn',
  rev: 'reverse',
  cryptography: 'crypto',
}

export const categoryConfigs: Record<string, CategoryConfig> = {
  sanity: {
    name: 'Sanity',
    icon: IconMoodHappyFilled,
    iconName: 'tabler:mood-happy-filled',
    color: 'gray',
  },
  pwn: {
    name: 'Binary Exploitation',
    icon: IconBombFilled,
    iconName: 'tabler:bomb-filled',
    color: 'red',
  },
  reverse: {
    name: 'Reverse Engineering',
    icon: IconPuzzleFilled,
    iconName: 'tabler:puzzle-filled',
    color: 'orange',
  },
  crypto: {
    name: 'Cryptography',
    icon: IconKeyFilled,
    iconName: 'tabler:key-filled',
    color: 'yellow',
  },
  forensics: {
    name: 'Forensics',
    icon: IconMicroscopeFilled,
    iconName: 'tabler:microscope-filled',
    color: 'green',
  },
  blockchain: {
    name: 'Blockchain',
    icon: IconCoinFilled,
    iconName: 'tabler:coin-filled',
    color: 'teal',
  },
  web: {
    name: 'Web',
    icon: IconCloudComputingFilled,
    iconName: 'tabler:cloud-computing-filled',
    color: 'blue',
  },
  misc: {
    name: 'Miscellaneous',
    icon: IconDice6Filled,
    iconName: 'tabler:dice-6-filled',
    color: 'purple',
  },
  ppc: {
    name: 'Professional Programming and Coding',
    icon: IconBinaryTreeFilled,
    iconName: 'tabler:binary-tree-filled',
    color: 'fuchsia',
  },
  koth: {
    name: 'King of the Hill',
    icon: IconChessQueenFilled,
    iconName: 'tabler:chess-queen-filled',
    color: 'pink',
  },
  osint: {
    name: 'OSINT',
    icon: IconEyeFilled,
    iconName: 'tabler:eye-filled',
    color: 'gray',
  },
}

const defaultConfig: CategoryConfig = {
  name: '',
  icon: IconFlagFilled,
  iconName: 'tabler:flag-filled',
  color: 'gray',
}

export function getCategoryKeyOrAlias(category: string): string {
  const key = category.toLowerCase()
  return categoryAliases[key] ?? key
}

export function getCategoryConfig(category: string): CategoryConfig {
  const key = getCategoryKeyOrAlias(category)
  const config = categoryConfigs[key]
  if (config) {
    return config
  }
  return { ...defaultConfig, name: key }
}

export function getCategoryStyle(color: string): string {
  return `--category-foreground-l0: var(--foreground-${color}-l0); --category-foreground-l1: var(--foreground-${color}-l1); --category-background-l0: var(--background-${color}-l0); --category-background-l1: var(--background-${color}-l1); --category-background-l1-hover: var(--background-${color}-l1-hover);`
}

export function getCategoryOrder(category: string): number {
  const key = getCategoryKeyOrAlias(category)
  const idx = categoryOrder.indexOf(key)
  return idx === -1 ? -1 : idx
}

export function getScoreboardCategoryOrder(category: string): number {
  const key = getCategoryKeyOrAlias(category)
  const idx = scoreboardCategoryOrder.indexOf(key)
  return idx === -1 ? -1 : idx
}
