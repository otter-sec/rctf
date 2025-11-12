import { config } from '@rctf/config'
import { RecoverRoute } from '@rctf/types'
import { createLoginVerification } from '../../../../services/auth-cache'
import { sendVerificationEmail } from '../../../../services/emails'
import { getUserByEmail } from '../../../../services/users'
import authGroup from '../group'

authGroup.route(RecoverRoute, async ({ ctx, body, res }) => {
  if (!config.email) {
    return res.badEndpoint()
  }

  const user = await getUserByEmail(ctx.var.db, body.email)
  if (user === undefined) {
    // originally was badUnknownEmail, changed to goodVerifySent
    return res.goodVerifySent()
  }

  const verifyToken = await createLoginVerification(ctx.var.redis, {
    kind: 'recover',
    userId: user.id,
    email: body.email,
  })

  await sendVerificationEmail(body.email, 'recover', verifyToken)
  return res.goodVerifySent()
})
