import { defineCommand } from 'citty'
import { withDbAndRedis } from '../../lib/context'
import { formatPerms } from '../../lib/perms'

export default defineCommand({
  meta: {
    name: 'list-admins',
    description: 'List all users with admin permissions',
  },
  run: async () => {
    const admins = await withDbAndRedis(async ({ db }) => {
      const { getAdminUsers } = await import('@rctf/api/src/services/users')
      return await getAdminUsers(db)
    })

    if (admins.length === 0) {
      console.log('No admin users found.')
      return
    }

    for (const admin of admins) {
      console.log(
        `${admin.id}  ${admin.name}  ${admin.email ?? '-'}  ${formatPerms(admin.perms)}`
      )
    }
  },
})
