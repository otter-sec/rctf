import { config } from '@rctf/config'
import {
  LoginRoute,
  RecoverRoute,
  RegisterRoute,
  TestAuthRoute,
  VerifyRoute,
} from '@rctf/types'
import { createRouterGroup } from '../../lib/route-module'
import { createToken, parseToken, TokenKind } from '../../lib/tokens'
import {
  checkLoginVerification,
  storeLoginVerification,
} from '../../services/auth-cache'
import { sendVerificationEmail } from '../../services/emails'
import { createUser, getUserByNameOrEmail } from '../../services/users'
import { allowedDivisions } from '../../util/acl'

const group = createRouterGroup()
export default group

group.declareRouter(RegisterRoute, async ({ res, body, ctx }) => {
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

group.declareRouter(VerifyRoute, async ({ ctx, body, res }) => {
  const tokenData = await parseToken(TokenKind.Verify, body.verifyToken)
  if (tokenData === null) {
    return res.badTokenVerification()
  }

  const tokenUnused = await checkLoginVerification(
    ctx.var.redis,
    tokenData.verifyId
  )
  if (!tokenUnused) {
    return res.badTokenVerification()
  }

  if (tokenData.kind !== 'register') {
    throw new Error(`Unsupported kind: ${tokenData.kind}`)
  }

  return await createUser(res, ctx.var.db, {
    division: tokenData.division,
    email: tokenData.email,
    name: tokenData.name,
    ctftimeId: null,
  })
})

group.declareRouter(LoginRoute, async ({ res }) => {
  return res.goodLogin({ authToken: 'dummy-auth-token' })
})

group.declareRouter(RecoverRoute, async ({ res }) => {
  return res.goodVerifySent()
})

group.declareRouter(TestAuthRoute, async ({ res }) => {
  // We will not reach this callback if unauthorized
  return res.goodToken()
})
