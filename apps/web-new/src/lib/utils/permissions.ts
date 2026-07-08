import type { Permissions } from '@rctf/types'

export function hasPermissions(
  user: { perms: number | null | undefined } | undefined | null,
  required: Permissions
): boolean {
  return (
    user !== null && user !== undefined && ((user.perms ?? 0) & required) !== 0
  )
}
