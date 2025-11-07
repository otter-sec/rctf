import { config } from '@rctf/config'
import {
  LoginRoute,
  RecoverRoute,
  RegisterRoute,
  TestAuthRoute,
  VerifyRoute,
} from '@rctf/types'
import { createRouterGroup } from '../../lib/route-module'
import { createUser } from '../../services/users'
import * as v1Validators from '../../util/v1-validators'

const group = createRouterGroup()
export default group

group.declareRouter(RegisterRoute, async ({ res, body, ctx }) => {
  if (!config.registrationsEnabled) {
    return res.badRegistrationsDisabled()
  }

  if (body.ctftimeToken) {
    return res.badCtftimeToken()
  }

  // Normalize the same way v1 does it
  body.name = v1Validators.normalizeName(body.name)
  if (body.email) {
    body.email = v1Validators.normalizeEmail(body.email)
  }

  // TODO(es3n1n): Ideally these should be checked with zod, but this will be a breaking change :)
  if (!v1Validators.validateName(body.name)) {
    ctx.var.logger.error(`${body.name} not valid`)
    return res.badName()
  }
  if (body.email && !v1Validators.validateEmail(body.email)) {
    return res.badEmail()
  }

  if (config.email) {
    // Unsupported atm
    return res.goodVerifySent()
  }

  const division = config.defaultDivision || Object.keys(config.divisions)[0]
  if (!division) {
    // TODO(es3n1n): proper error
    return res.badCompetitionNotAllowed()
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
