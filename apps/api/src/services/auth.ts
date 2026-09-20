import { config } from '@rctf/config'
import type { DatabaseClient } from '@rctf/db'
import type {
  BadCompetitionNotAllowed,
  BadCtftimeToken,
  BadEndpoint,
  BadKnownCtftimeId,
  BadKnownEmail,
  BadKnownName,
  BadRateLimit,
  BadCredentials,
  BadRegistrationsDisabled,
  GoodLogin,
  GoodRegister,
  GoodRegisterV2,
  GoodVerifySent,
  ResponseHelpers,
} from '@rctf/types'
import type { TypedRedis } from '../cache/scripts'
import { createToken, parseToken, TokenKind } from '../lib/tokens'
import { allowedDivisions } from '../util/acl'
import { sendVerificationEmail } from './emails'
import {
  checkPassword,
  getUserCredentialsByIdentifier,
  hashPassword,
} from './passwords'
import {
  rateLimitLoginByIdentifier,
  rateLimitLoginByIp,
  rateLimitRecoverByEmail,
  rateLimitRecoverByIp,
  rateLimitRegisterByEmail,
  rateLimitRegisterByIp,
  rateLimitRegisterByName,
} from './rate-limit'
import { createPendingRegistrationVerification } from './registration-verifications'
import {
  createUser,
  createUserV2,
  getUserByEmail,
  getUserByNameOrEmail,
  type UserToCreate,
} from './users'

type RegisterResponseHelpers = ResponseHelpers<
  [
    typeof BadRegistrationsDisabled,
    typeof BadEndpoint,
    typeof BadCompetitionNotAllowed,
    typeof BadKnownName,
    typeof BadKnownEmail,
    typeof BadKnownCtftimeId,
    typeof BadRateLimit,
    typeof GoodVerifySent,
    typeof BadCtftimeToken,
    typeof GoodRegister,
  ]
>

type RegisterV2ResponseHelpers = ResponseHelpers<
  [
    typeof BadRegistrationsDisabled,
    typeof BadEndpoint,
    typeof BadCompetitionNotAllowed,
    typeof BadKnownName,
    typeof BadKnownEmail,
    typeof BadKnownCtftimeId,
    typeof BadRateLimit,
    typeof GoodVerifySent,
    typeof BadCtftimeToken,
    typeof GoodRegisterV2,
  ]
>

type RegisterCommonResponseHelpers = ResponseHelpers<
  [
    typeof BadRegistrationsDisabled,
    typeof BadEndpoint,
    typeof BadCompetitionNotAllowed,
    typeof BadKnownName,
    typeof BadKnownEmail,
    typeof BadRateLimit,
    typeof GoodVerifySent,
    typeof BadCtftimeToken,
  ]
>

type RecoverResponseHelpers = ResponseHelpers<
  [typeof BadEndpoint, typeof BadRateLimit, typeof GoodVerifySent]
>

type LoginPasswordResponseHelpers = ResponseHelpers<
  [typeof BadCredentials, typeof BadRateLimit, typeof GoodLogin]
>

type RegisterUserBody = {
  email?: string
  name: string
  ctftimeToken?: string
  password?: string
}
type RegisterResult = ReturnType<
  RegisterResponseHelpers[keyof RegisterResponseHelpers]
>
type RegisterV2Result = ReturnType<
  RegisterV2ResponseHelpers[keyof RegisterV2ResponseHelpers]
>
type RegisterCommonResult = ReturnType<
  RegisterCommonResponseHelpers[keyof RegisterCommonResponseHelpers]
>

type PrepareRegistrationResult =
  | { hasResult: true; response: RegisterCommonResult }
  | { hasResult: false; userToCreate: UserToCreate }

const prepareRegistration = async (
  res: RegisterCommonResponseHelpers,
  db: DatabaseClient,
  redis: TypedRedis,
  body: RegisterUserBody,
  ip: string
): Promise<PrepareRegistrationResult> => {
  if (!config.registrationsEnabled) {
    return { hasResult: true, response: res.badRegistrationsDisabled() }
  }

  if (body.ctftimeToken && !config.ctftime) {
    return { hasResult: true, response: res.badEndpoint() }
  }

  const division = allowedDivisions({
    // A password registration creates the row immediately, so its email is
    // unverified. Hiding it here keeps divisionACLs from handing out a
    // restricted division for free; allowedDivisions answers defaultDivision
    // when there is no email.
    email: body.password ? null : body.email,
    defaultOnly: true,
  })[0]
  if (!division) {
    return { hasResult: true, response: res.badCompetitionNotAllowed() }
  }

  const ipTimeLeft = await rateLimitRegisterByIp(redis, ip)
  if (ipTimeLeft) {
    return {
      hasResult: true,
      response: res.badRateLimit({ timeLeft: ipTimeLeft }),
    }
  }

  // Before hashing, so a rejected request never pays for an argon2.
  const conflict = await getUserByNameOrEmail(db, {
    name: body.name,
    email: body.email,
  })
  if (conflict) {
    if (conflict.name === body.name) {
      return { hasResult: true, response: res.badKnownName() }
    }
    return { hasResult: true, response: res.badKnownEmail() }
  }

  // Registration with email, and no password to skip the round-trip with:
  if (config.email && body.email && !body.password) {
    const emailTimeLeft = await rateLimitRegisterByEmail(redis, body.email)
    if (emailTimeLeft) {
      return {
        hasResult: true,
        response: res.badRateLimit({ timeLeft: emailTimeLeft }),
      }
    }

    const verification = await createPendingRegistrationVerification(db, {
      email: body.email,
      name: body.name,
      division: division,
    })

    await sendVerificationEmail(
      db,
      body.email,
      'register',
      verification.token,
      redis
    )
    return { hasResult: true, response: res.goodVerifySent() }
  }

  const userToCreate: UserToCreate = {
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
      return { hasResult: true, response: res.badCtftimeToken() }
    }

    userToCreate.ctftimeId = ctftimeToken.ctftimeId
  }

  if (body.password) {
    const nameTimeLeft = await rateLimitRegisterByName(redis, body.name)
    if (nameTimeLeft) {
      return {
        hasResult: true,
        response: res.badRateLimit({ timeLeft: nameTimeLeft }),
      }
    }

    userToCreate.passwordHash = await hashPassword(body.password)
  }

  // Registration without any verification, or if ctftime token was successfully resolved:
  return { hasResult: false, userToCreate }
}

export const registerUser = async (
  res: RegisterResponseHelpers,
  db: DatabaseClient,
  redis: TypedRedis,
  body: RegisterUserBody,
  ip: string
): Promise<RegisterResult> => {
  const prepared = await prepareRegistration(res, db, redis, body, ip)
  if (prepared.hasResult) {
    return prepared.response
  }

  return await createUser(res, db, prepared.userToCreate)
}

export const registerUserV2 = async (
  res: RegisterV2ResponseHelpers,
  db: DatabaseClient,
  redis: TypedRedis,
  body: RegisterUserBody,
  ip: string
): Promise<RegisterV2Result> => {
  const prepared = await prepareRegistration(res, db, redis, body, ip)
  if (prepared.hasResult) {
    return prepared.response
  }

  return await createUserV2(res, db, prepared.userToCreate)
}

export const loginWithPassword = async (
  res: LoginPasswordResponseHelpers,
  db: DatabaseClient,
  redis: TypedRedis,
  body: { identifier: string; password: string },
  ip: string
): Promise<
  ReturnType<LoginPasswordResponseHelpers[keyof LoginPasswordResponseHelpers]>
> => {
  // Captcha, when the deployment configures one, has already run in the
  // router. Both buckets are consumed before any argon2.
  const ipTimeLeft = await rateLimitLoginByIp(redis, ip)
  if (ipTimeLeft) {
    return res.badRateLimit({ timeLeft: ipTimeLeft })
  }

  const identifierTimeLeft = await rateLimitLoginByIdentifier(
    redis,
    body.identifier
  )
  if (identifierTimeLeft) {
    return res.badRateLimit({ timeLeft: identifierTimeLeft })
  }

  const credentials = await getUserCredentialsByIdentifier(db, body.identifier)
  const ok = await checkPassword(body.password, credentials?.passwordHash)
  if (!ok || !credentials) {
    return res.badCredentials()
  }

  const authToken = await createToken(TokenKind.Auth, credentials.id)
  return res.goodLogin({ authToken })
}

export const recoverUser = async (
  res: RecoverResponseHelpers,
  db: DatabaseClient,
  redis: TypedRedis,
  email: string,
  ip: string
): Promise<
  ReturnType<RecoverResponseHelpers[keyof RecoverResponseHelpers]>
> => {
  if (!config.email) {
    return res.badEndpoint()
  }

  const ipTimeLeft = await rateLimitRecoverByIp(redis, ip)
  if (ipTimeLeft) {
    return res.badRateLimit({ timeLeft: ipTimeLeft })
  }

  const emailTimeLeft = await rateLimitRecoverByEmail(redis, email)
  if (emailTimeLeft) {
    return res.badRateLimit({ timeLeft: emailTimeLeft })
  }

  const user = await getUserByEmail(db, email)
  if (user === undefined) {
    // Do not leak existence of user
    return res.goodVerifySent()
  }

  // v2 change: send team token, its lifetime is infinite
  const teamToken = await createToken(TokenKind.Team, user.id)

  await sendVerificationEmail(db, email, 'recover', teamToken, redis)
  return res.goodVerifySent()
}
