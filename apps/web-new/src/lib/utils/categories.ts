import IconBinaryTreeFilled from '$lib/icons/icon-binary-tree-filled.svelte'
import IconBombFilled from '$lib/icons/icon-bomb-filled.svelte'
import IconChessQueenFilled from '$lib/icons/icon-chess-queen-filled.svelte'
import IconCloudComputingFilled from '$lib/icons/icon-cloud-computing-filled.svelte'
import IconCoinFilled from '$lib/icons/icon-coin-filled.svelte'
import IconDice6Filled from '$lib/icons/icon-dice6-filled.svelte'
import IconEyeFilled from '$lib/icons/icon-eye-filled.svelte'
import IconFlagFilled from '$lib/icons/icon-flag-filled.svelte'
import IconKeyFilled from '$lib/icons/icon-key-filled.svelte'
import IconMicroscopeFilled from '$lib/icons/icon-microscope-filled.svelte'
import IconMoodHappyFilled from '$lib/icons/icon-mood-happy-filled.svelte'
import IconPuzzleFilled from '$lib/icons/icon-puzzle-filled.svelte'
import type { Component } from 'svelte'
import type { SVGAttributes } from 'svelte/elements'

export type IconComponent = Component<SVGAttributes<SVGSVGElement>>

export type CategoryColor =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'blue'
  | 'purple'
  | 'fuchsia'
  | 'pink'
  | 'gray'

export type CategoryConfig = {
  name: string
  icon: IconComponent
  color: CategoryColor
}

export const categoryOrder = [
  'koth',
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
