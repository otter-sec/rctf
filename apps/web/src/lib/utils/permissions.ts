import { Permissions } from '@rctf/types'

export const ADMIN_PANEL_PERMISSIONS =
  Permissions.challsRead | Permissions.usersWrite | Permissions.settingsWrite

export function hasPermissions(
  user: { perms: number | null | undefined } | undefined | null,
  required: number
): boolean {
  return (
    user !== null &&
    user !== undefined &&
    ((user.perms ?? 0) & required) === required
  )
}

export function hasAnyPermission(
  user: { perms: number | null | undefined } | undefined | null,
  permissions: number
): boolean {
  return (
    user !== null &&
    user !== undefined &&
    ((user.perms ?? 0) & permissions) !== 0
  )
}
