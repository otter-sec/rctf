import { config } from '@rctf/config'
import type { User } from '@rctf/db'
import { RegisterRoute } from '@rctf/types'
import { createLoginVerification } from '../../../../cache/auth-cache'
import { parseToken, TokenKind } from '../../../../lib/tokens'
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

  // Registration with email:
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

    const verificationToken = await createLoginVerification(ctx.var.redis, {
      kind: 'register',
      email: body.email,
      name: body.name,
      division: division,
    })

    await sendVerificationEmail(body.email, 'register', verificationToken)
    return res.goodVerifySent()
  }

  const userToCreate: Pick<User, 'division' | 'email' | 'name' | 'ctftimeId'> =
    {
      division,
      email: body.email,
      name: body.name,
      ctftimeId: null,
    }

  // Registration with ctftime
  if (body.ctftimeToken) {
    const ctftimeToken = await parseToken(
      TokenKind.CtftimeAuth,
      body.ctftimeToken
    )
    if (!ctftimeToken) {
      return res.badCtftimeToken()
    }

    userToCreate.ctftimeId = ctftimeToken.ctftimeId
  }

  // Registration without any verification, or if ctftime token was successfully resolved:
  return await createUser(res, ctx.var.db, userToCreate)
})
