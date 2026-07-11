import { Permissions } from '@rctf/types'
import { hasPermissions } from '$lib/utils/permissions'

export type AdminGate = 'loggedOut' | 'noPerms' | 'ok'

export function decideAdminGate(
  user: { perms: number | null | undefined } | undefined | null
): AdminGate {
  if (user === null || user === undefined) {
    return 'loggedOut'
  }
  return hasPermissions(user, Permissions.challsRead) ? 'ok' : 'noPerms'
}
