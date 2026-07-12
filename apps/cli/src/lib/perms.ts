import { Permissions } from '@rctf/types'

const PERMISSION_NAMES = Object.keys(Permissions).filter(key =>
  isNaN(Number(key))
)

export const parsePermsList = (raw: string): number => {
  let perms = 0
  for (const part of raw.split(',')) {
    const name = part.trim()
    if (!name) {
      continue
    }
    const value = Permissions[name as keyof typeof Permissions]
    if (typeof value !== 'number') {
      throw new Error(
        `Unknown permission '${name}'. Valid permissions: ${PERMISSION_NAMES.join(', ')}`
      )
    }
    perms |= value
  }
  return perms
}

export const formatPerms = (perms: number): string => {
  const names = PERMISSION_NAMES.filter(
    name => (perms & Permissions[name as keyof typeof Permissions]) !== 0
  )
  return names.length > 0 ? `${names.join(',')} (${perms})` : 'none (0)'
}
