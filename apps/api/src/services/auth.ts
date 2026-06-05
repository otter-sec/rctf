import { config } from '@rctf/config'
import type { DatabaseClient, User } from '@rctf/db'
import type {
  BadCompetitionNotAllowed,
  BadCtftimeToken,
  BadEndpoint,
  BadKnownCtftimeId,
  BadKnownEmail,
  BadKnownName,
  BadRateLimit,
  BadRegistrationsDisabled,
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
  rateLimitRecoverByEmail,
  rateLimitRecoverByIp,
  rateLimitRegisterByEmail,
  rateLimitRegisterByIp,
} from './rate-limit'
import { createPendingRegistrationVerification } from './registration-verifications'
import {
  createUser,
  createUserV2,
  getUserByEmail,
  getUserByNameOrEmail,
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

type RegisterUserBody = {
  email?: string
  name: string
  ctftimeToken?: string
}

type UserToCreate = Pick<User, 'division' | 'email' | 'name' | 'ctftimeId'>
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

  // Will return the first division if email is not provided,
  //  we are assuming ctftime auth is always disabled with email ACLs.
  const division = allowedDivisions({
    email: body.email,
    defaultOnly: true,
  })[0]
  if (!division) {
    return { hasResult: true, response: res.badCompetitionNotAllowed() }
  }

  // Registration with email:
  if (config.email && body.email) {
    // Prior to sending the verification email we need to make sure there are no conflicts
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

    const ipTimeLeft = await rateLimitRegisterByIp(redis, ip)
    if (ipTimeLeft) {
      return {
        hasResult: true,
        response: res.badRateLimit({ timeLeft: ipTimeLeft }),
      }
    }

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

    await sendVerificationEmail(body.email, 'register', verification.token)
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

  await sendVerificationEmail(email, 'recover', teamToken)
  return res.goodVerifySent()
}
