import { Permissions } from '@rctf/types'
import { hasPermissions } from '$lib/utils/permissions'

export type AdminGate = 'loggedOut' | 'noPerms' | 'ok'

// Decides admin access from the resolved current user. `null`/`undefined` means
// logged out (the self query returns `null` without a token); a logged-in user
// still needs the challsRead bit, which every admin route requires.
export function decideAdminGate(
  user: { perms: number | null | undefined } | undefined | null
): AdminGate {
  if (user === null || user === undefined) {
    return 'loggedOut'
  }
  return hasPermissions(user, Permissions.challsRead) ? 'ok' : 'noPerms'
}
