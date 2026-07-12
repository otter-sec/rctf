import { ALL_PERMISSIONS } from '@rctf/types'
import { defineCommand } from 'citty'
import { withDbAndRedis } from '../../lib/context'
import { formatPerms, parsePermsList } from '../../lib/perms'

export default defineCommand({
  meta: {
    name: 'promote',
    description: 'Grant admin permissions to a user',
  },
  args: {
    email: {
      type: 'positional',
      description: 'Email of the user to promote',
      required: true,
    },
    perms: {
      type: 'string',
      description:
        'Comma-separated permission names (defaults to all permissions)',
    },
  },
  run: async ({ args }) => {
    const perms = args.perms ? parsePermsList(args.perms) : ALL_PERMISSIONS

    const updated = await withDbAndRedis(async ({ db, redis }) => {
      const { getUserByEmail, setUserPerms } =
        await import('@rctf/api/src/services/users')

      const user = await getUserByEmail(db, args.email)
      if (!user) {
        return undefined
      }

      return await setUserPerms(db, redis, user.id, perms)
    })

    if (!updated) {
      console.error(`No user found with email '${args.email}'`)
      process.exit(1)
    }

    console.log(
      `Promoted ${updated.name} (${updated.id}): ${formatPerms(updated.perms)}`
    )
  },
})
