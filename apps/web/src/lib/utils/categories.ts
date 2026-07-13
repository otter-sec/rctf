import {
  IconBomb,
  IconBoxingGlove,
  IconCloud,
  IconCrown,
  IconDiceFive,
  IconEye,
  IconFingerprint,
  IconFlagBanner,
  IconGraph,
  IconKey,
  IconPiggyBank,
  IconPuzzlePiece,
  IconSmiley,
} from '$lib/icons'
import type { Component } from 'svelte'
import type { SVGAttributes } from 'svelte/elements'

export type IconComponent = Component<SVGAttributes<SVGSVGElement>>

export type CategoryColor =
  | 'crimson'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'sky'
  | 'violet'
  | 'plum'
  | 'gray'

export type CategoryConfig = {
  name: string
  icon: IconComponent
  color: CategoryColor
}

export const categoryOrder = [
  'koth',
  'ad',
  'sanity',
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

export const scoreboardCategoryOrder = [
  'koth',
  'ad',
  'pwn',
  'reverse',
  'crypto',
  'forensics',
  'blockchain',
  'web',
  'misc',
  'ppc',
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
    icon: IconSmiley,
    color: 'gray',
  },
  pwn: {
    name: 'Binary Exploitation',
    icon: IconBomb,
    color: 'red',
  },
  reverse: {
    name: 'Reverse Engineering',
    icon: IconPuzzlePiece,
    color: 'orange',
  },
  crypto: {
    name: 'Cryptography',
    icon: IconKey,
    color: 'yellow',
  },
  forensics: {
    name: 'Forensics',
    icon: IconFingerprint,
    color: 'green',
  },
  blockchain: {
    name: 'Blockchain',
    icon: IconPiggyBank,
    color: 'teal',
  },
  web: {
    name: 'Web',
    icon: IconCloud,
    color: 'sky',
  },
  misc: {
    name: 'Miscellaneous',
    icon: IconDiceFive,
    color: 'violet',
  },
  ppc: {
    name: 'Professional Programming and Coding',
    icon: IconGraph,
    color: 'plum',
  },
  koth: {
    name: 'King of the Hill',
    icon: IconCrown,
    color: 'plum',
  },
  ad: {
    name: 'Attack-Defense',
    icon: IconBoxingGlove,
    color: 'crimson',
  },
  osint: {
    name: 'OSINT',
    icon: IconEye,
    color: 'gray',
  },
}

const defaultConfig: CategoryConfig = {
  name: '',
  icon: IconFlagBanner,
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

export function getCategoryOrder(category: string): number {
  const key = getCategoryKeyOrAlias(category)
  const idx = categoryOrder.indexOf(key)
  return idx === -1 ? -1 : idx
}

export function compareCategories(a: string, b: string): number {
  const orderA = getCategoryOrder(a)
  const orderB = getCategoryOrder(b)
  if (orderA === -1 && orderB === -1) {
    return a.localeCompare(b)
  }
  if (orderA === -1) {
    return 1
  }
  if (orderB === -1) {
    return -1
  }
  return orderA - orderB
}

export function getScoreboardCategoryOrder(category: string): number {
  const key = getCategoryKeyOrAlias(category)
  const idx = scoreboardCategoryOrder.indexOf(key)
  return idx === -1 ? -1 : idx
}
