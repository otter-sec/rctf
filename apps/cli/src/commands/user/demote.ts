import { defineCommand } from 'citty'
import { withDbAndRedis } from '../../lib/context'

export default defineCommand({
  meta: {
    name: 'demote',
    description: 'Revoke all admin permissions from a user',
  },
  args: {
    email: {
      type: 'positional',
      description: 'Email of the user to demote',
      required: true,
    },
  },
  run: async ({ args }) => {
    const updated = await withDbAndRedis(async ({ db, redis }) => {
      const { getUserByEmail, setUserPerms } =
        await import('@rctf/api/src/services/users')

      const user = await getUserByEmail(db, args.email)
      if (!user) {
        return undefined
      }

      return await setUserPerms(db, redis, user.id, 0)
    })

    if (!updated) {
      console.error(`No user found with email '${args.email}'`)
      process.exit(1)
    }

    console.log(`Demoted ${updated.name} (${updated.id})`)
  },
})
