import IconBinaryTreeFilled from '~icons/tabler/binary-tree-filled'
import IconBombFilled from '~icons/tabler/bomb-filled'
import IconCloudComputingFilled from '~icons/tabler/cloud-computing-filled'
import IconCoins from '~icons/tabler/coins'
import IconDice6Filled from '~icons/tabler/dice-6-filled'
import IconEyeFilled from '~icons/tabler/eye-filled'
import IconFlagFilled from '~icons/tabler/flag-filled'
import IconKeyFilled from '~icons/tabler/key-filled'
import IconMicroscopeFilled from '~icons/tabler/microscope-filled'
import IconPuzzleFilled from '~icons/tabler/puzzle-filled'
import type { Component } from 'svelte'

export type CategoryConfig = {
  name: string
  icon: Component<{ class?: string }>
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

export function getCategoryConfig(category: string): CategoryConfig {
  const key = category.toLowerCase()
  const config = categoryConfigs[key]
  if (config) return config
  return { ...defaultConfig, name: category }
}

export function getCategoryStyle(color: string): string {
  return `--category-foreground-l0: var(--foreground-${color}-l0); --category-foreground-l1: var(--foreground-${color}-l1); --category-background-l0: var(--background-${color}-l0); --category-background-l1: var(--background-${color}-l1); --category-background-l1-hover: var(--background-${color}-l1-hover);`
}

export function getCategoryOrder(category: string): number {
  const key = category.toLowerCase()
  const idx = categoryOrder.indexOf(key)
  return idx === -1 ? -1 : idx
}
