import {
  ADMIN_PANEL_PERMISSIONS,
  hasAnyPermission,
} from '$lib/utils/permissions'

export type AdminGate = 'loggedOut' | 'noPerms' | 'ok'

export function decideAdminGate(
  user: { perms: number | null | undefined } | undefined | null
): AdminGate {
  if (user === null || user === undefined) {
    return 'loggedOut'
  }
  return hasAnyPermission(user, ADMIN_PANEL_PERMISSIONS) ? 'ok' : 'noPerms'
}
