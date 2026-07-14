import { config } from '@rctf/config'
import { SetEmailRoute } from '@rctf/types'
import { createLoginVerification } from '../../../../cache/auth-cache'
import { sendVerificationEmail } from '../../../../services/emails'
import { rateLimitSetEmail } from '../../../../services/rate-limit'
import { getUserByEmail, updateUserEmail } from '../../../../services/users'
import { divisionAllowed } from '../../../../util/acl'
import usersGroup from '../group'

usersGroup.route(SetEmailRoute, async ({ ctx, res, body, user }) => {
  if (!divisionAllowed(body.email, user.division)) {
    return res.badEmailChangeDivision()
  }

  const timeLeft = await rateLimitSetEmail(ctx.var.redis, user.id)
  if (timeLeft) {
    return res.badRateLimit({ timeLeft })
  }

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
    await sendVerificationEmail(
      ctx.var.db,
      body.email,
      'update',
      verificationToken,
      ctx.var.redis
    )
    return res.goodVerifySent()
  }

  return await updateUserEmail(res, ctx.var.db, ctx.var.redis, user.id, {
    email: body.email,
  })
})
