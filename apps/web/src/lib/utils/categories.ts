import {
  IconBinaryTreeFilled,
  IconBombFilled,
  IconCloudComputingFilled,
  IconCoins,
  IconDice6Filled,
  IconEyeFilled,
  IconFlagFilled,
  IconKeyFilled,
  IconMicroscopeFilled,
  IconPuzzleFilled,
  type IconComponent,
} from '$lib/icons'

export type CategoryConfig = {
  name: string
  icon: IconComponent
  color: string
}

export const categoryOrder = [
  'pwn',
  'reverse',
  'crypto',
  'forensics',
  'blockchain',
  'web',
  'misc',
  'ppc',
  'osint',
]

export const categoryAliases: Record<string, string> = {
  binary: 'pwn',
  rev: 'reverse',
  cryptography: 'crypto',
  for: 'forensics',
}

export const categoryConfigs: Record<string, CategoryConfig> = {
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
    icon: IconCoins,
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
