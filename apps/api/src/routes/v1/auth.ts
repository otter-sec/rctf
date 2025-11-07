import { config } from '@rctf/config'
import {
  LoginRoute,
  RecoverRoute,
  RegisterRoute,
  TestAuthRoute,
  VerifyRoute,
} from '@rctf/types'
import { createRouterGroup } from '../../lib/route-module'
import { createToken, TokenKind } from '../../lib/tokens'
import { storeLoginVerification } from '../../services/auth-cache'
import { sendVerificationEmail } from '../../services/emails'
import { createUser, getUserByNameOrEmail } from '../../services/users'
import * as v1Validators from '../../util/v1-validators'

const group = createRouterGroup()
export default group

group.declareRouter(RegisterRoute, async ({ res, body, ctx }) => {
  if (!config.registrationsEnabled) {
    return res.badRegistrationsDisabled()
  }

  // Normalize the same way v1 does it
  body.name = v1Validators.normalizeName(body.name)
  if (body.email) {
    body.email = v1Validators.normalizeEmail(body.email)
  }

  // TODO(es3n1n): Ideally these should be checked with zod, but that would be a breaking change :)
  if (!v1Validators.validateName(body.name)) {
    ctx.var.logger.error(`${body.name} not valid`)
    return res.badName()
  }
  if (body.email && !v1Validators.validateEmail(body.email)) {
    return res.badEmail()
  }

  const division = config.defaultDivision || Object.keys(config.divisions)[0]
  if (!division) {
    throw new Error('No divisions provided')
  }

  if (config.email && body.email) {
    // TODO(es3n1n): divisions ACL

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
    await storeLoginVerification(ctx.var.redis, { id: verificationId })
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

group.declareRouter(VerifyRoute, async ({ res }) => {
  return res.goodVerify({ authToken: 'dummy-verified-token' })
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
