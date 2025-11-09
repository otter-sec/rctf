import { config } from '@rctf/config'
import { RegisterRoute } from '@rctf/types'
import { createToken, TokenKind } from '../../../../lib/tokens'
import { storeLoginVerification } from '../../../../services/auth-cache'
import { sendVerificationEmail } from '../../../../services/emails'
import { createUser, getUserByNameOrEmail } from '../../../../services/users'
import { allowedDivisions } from '../../../../util/acl'
import authGroup from '../group'

authGroup.route(RegisterRoute, async ({ res, body, ctx }) => {
  if (!config.registrationsEnabled) {
    return res.badRegistrationsDisabled()
  }

  const division = allowedDivisions({
    email: body.email,
    defaultOnly: true,
  })[0]
  if (!division) {
    return res.badCompetitionNotAllowed()
  }

  if (config.email && body.email) {
    // Prior to sending the verification email we need to make sure there are no conflicts
    const conflict = await getUserByNameOrEmail(ctx.var.db, {
      name: body.name,
      email: body.email,
    })
    if (conflict) {
      if (conflict.name === body.name) {
        return res.badKnownName()
      }
      return res.badKnownEmail()
    }

    const verificationId = crypto.randomUUID()
    await storeLoginVerification(ctx.var.redis, verificationId)
    const verificationToken = await createToken(TokenKind.Verify, {
      kind: 'register',
      verifyId: verificationId,
      email: body.email,
      name: body.name,
      division: division,
    })

    await sendVerificationEmail(body.email, 'register', verificationToken)
    return res.goodVerifySent()
  }

  if (body.ctftimeToken) {
    // Unsupported atm
    return res.badCtftimeToken()
  }

  return await createUser(res, ctx.var.db, {
    division,
    email: body.email,
    name: body.name,
    ctftimeId: null,
  })
})
