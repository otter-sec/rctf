import { config } from '@rctf/config'
import { SetEmailRoute } from '@rctf/types'
import { createLoginVerification } from '../../../../cache/auth-cache'
import { sendVerificationEmail } from '../../../../services/emails'
import { getUserByEmail, updateUserEmail } from '../../../../services/users'
import usersGroup from '../group'

usersGroup.route(SetEmailRoute, async ({ ctx, res, body, user }) => {
  if (config.email) {
    const conflict = await getUserByEmail(ctx.var.db, body.email)
    if (conflict) {
      return res.badKnownEmail()
    }

    const verificationToken = await createLoginVerification(ctx.var.redis, {
      kind: 'update',
      userId: user.id,
      email: body.email,
    })
    await sendVerificationEmail(body.email, 'update', verificationToken)
    return res.goodVerifySent()
  }

  return await updateUserEmail(res, ctx.var.db, ctx.var.redis, user.id, {
    email: body.email,
  })
})
