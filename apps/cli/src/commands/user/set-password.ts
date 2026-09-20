import { UserIdentifier, UserPassword } from '@rctf/types'
import { defineCommand } from 'citty'
import { withDbAndRedis } from '../../lib/context'
import { promptHidden } from '../../lib/prompt'

export default defineCommand({
  meta: {
    name: 'set-password',
    description: 'Set or reset a user password, prompting on stdin',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Team name or email address of the user',
      required: true,
    },
  },
  // The password is prompted for, never an argument: argv lands in shell
  // history and in the process list.
  run: async ({ args }) => {
    const password = await promptHidden('New password: ')
    const checked = UserPassword.safeParse(password)
    if (!checked.success) {
      console.error(checked.error.issues[0]?.message ?? 'Invalid password')
      process.exit(1)
    }

    const confirmation = await promptHidden('Confirm password: ')
    if (confirmation !== password) {
      console.error('Passwords do not match')
      process.exit(1)
    }

    const updated = await withDbAndRedis(async ({ db, redis }) => {
      const { getUserCredentialsByIdentifier, hashPassword, setUserPassword } =
        await import('@rctf/api/src/services/passwords')

      const credentials = await getUserCredentialsByIdentifier(
        db,
        UserIdentifier.parse(args.name)
      )
      if (!credentials) {
        return false
      }

      await setUserPassword(
        db,
        redis,
        credentials.id,
        await hashPassword(password)
      )
      return true
    })

    if (!updated) {
      console.error(`No user found with name '${args.name}'`)
      process.exit(1)
    }

    console.log(
      `Password set for '${args.name}'. All previously issued tokens are now rejected.`
    )
  },
})
