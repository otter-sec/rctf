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

export const categoryAliases: Record<string, string> = {
  binary: 'pwn',
  rev: 'reverse',
  cryptography: 'crypto',
}

export const categoryConfigs: Record<string, CategoryConfig> = {
  sanity: {
    name: 'Sanity',
    icon: IconMoodHappyFilled,
    color: 'gray',
  },
  pwn: {
    name: 'Binary Exploitation',
    icon: IconBombFilled,
    color: 'red',
  },
  reverse: {
    name: 'Reverse Engineering',
    icon: IconPuzzleFilled,
    color: 'orange',
  },
  crypto: {
    name: 'Cryptography',
    icon: IconKeyFilled,
    color: 'yellow',
  },
  forensics: {
    name: 'Forensics',
    icon: IconMicroscopeFilled,
    color: 'green',
  },
  blockchain: {
    name: 'Blockchain',
    icon: IconCoinFilled,
    color: 'teal',
  },
  web: {
    name: 'Web',
    icon: IconCloudComputingFilled,
    color: 'blue',
  },
  misc: {
    name: 'Miscellaneous',
    icon: IconDice6Filled,
    color: 'purple',
  },
  ppc: {
    name: 'Professional Programming and Coding',
    icon: IconBinaryTreeFilled,
    color: 'fuchsia',
  },
  koth: {
    name: 'King of the Hill',
    icon: IconChessQueenFilled,
    color: 'pink',
  },
  osint: {
    name: 'OSINT',
    icon: IconEyeFilled,
    color: 'gray',
  },
}

const defaultConfig: CategoryConfig = {
  name: '',
  icon: IconFlagFilled,
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
