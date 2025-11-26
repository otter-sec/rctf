export type CategoryConfig = {
  name: string
  icon: string
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
    icon: 'tabler:bomb-filled',
    color: 'red',
  },
  reverse: {
    name: 'Reverse Engineering',
    icon: 'tabler:puzzle-filled',
    color: 'orange',
  },
  crypto: {
    name: 'Cryptography',
    icon: 'tabler:key-filled',
    color: 'yellow',
  },
  forensics: {
    name: 'Forensics',
    icon: 'tabler:microscope-filled',
    color: 'green',
  },
  blockchain: {
    name: 'Blockchain',
    icon: 'tabler:coins',
    color: 'teal',
  },
  web: {
    name: 'Web',
    icon: 'tabler:cloud-computing-filled',
    color: 'blue',
  },
  misc: {
    name: 'Miscellaneous',
    icon: 'tabler:dice-6-filled',
    color: 'purple',
  },
  ppc: {
    name: 'Professional Programming and Coding',
    icon: 'tabler:binary-tree-filled',
    color: 'pink',
  },
  osint: {
    name: 'OSINT',
    icon: 'tabler:eye-filled',
    color: 'gray',
  },
}

const defaultConfig: CategoryConfig = {
  name: '',
  icon: 'tabler:flag-filled',
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
