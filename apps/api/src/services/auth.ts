import { config } from '@rctf/config'
import type { DatabaseClient, User } from '@rctf/db'
import type {
  BadCompetitionNotAllowed,
  BadCtftimeToken,
  BadEndpoint,
  BadKnownCtftimeId,
  BadKnownEmail,
  BadKnownName,
  BadRegistrationsDisabled,
  GoodRegister,
  GoodRegisterV2,
  GoodVerifySent,
  ResponseHelpers,
} from '@rctf/types'
import { createLoginVerification } from '../cache/auth-cache'
import type { TypedRedis } from '../cache/scripts'
import { createToken, parseToken, TokenKind } from '../lib/tokens'
import { allowedDivisions } from '../util/acl'
import { sendVerificationEmail } from './emails'
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
    typeof GoodVerifySent,
    typeof BadCtftimeToken,
    typeof GoodRegisterV2,
  ]
>

type RecoverResponseHelpers = ResponseHelpers<
  [typeof BadEndpoint, typeof GoodVerifySent]
>

type RegisterUserBody = {
  email?: string
  name: string
  ctftimeToken?: string
}

const registerUserInternal = async (
  res: RegisterResponseHelpers | RegisterV2ResponseHelpers,
  db: DatabaseClient,
  redis: TypedRedis,
  body: RegisterUserBody,
  create: (
    res: any,
    db: DatabaseClient,
    user: Pick<User, 'division' | 'email' | 'name' | 'ctftimeId'>
  ) => Promise<any>
): Promise<any> => {
  if (!config.registrationsEnabled) {
    return res.badRegistrationsDisabled()
  }

  if (body.ctftimeToken && !config.ctftime) {
    return res.badEndpoint()
  }

  // Will return the first division if email is not provided,
  //  we are assuming ctftime auth is always disabled with email ACLs.
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
    const conflict = await getUserByNameOrEmail(db, {
      name: body.name,
      email: body.email,
    })
    if (conflict) {
      if (conflict.name === body.name) {
        return res.badKnownName()
      }
      return res.badKnownEmail()
    }

    const verificationToken = await createLoginVerification(redis, {
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
  return await create(res, db, userToCreate)
}

export const registerUser = async (
  res: RegisterResponseHelpers,
  db: DatabaseClient,
  redis: TypedRedis,
  body: RegisterUserBody
): Promise<
  ReturnType<RegisterResponseHelpers[keyof RegisterResponseHelpers]>
> => {
  return await registerUserInternal(res, db, redis, body, createUser)
}

export const registerUserV2 = async (
  res: RegisterV2ResponseHelpers,
  db: DatabaseClient,
  redis: TypedRedis,
  body: RegisterUserBody
): Promise<
  ReturnType<RegisterV2ResponseHelpers[keyof RegisterV2ResponseHelpers]>
> => {
  return await registerUserInternal(res, db, redis, body, createUserV2)
}

export const recoverUser = async (
  res: RecoverResponseHelpers,
  db: DatabaseClient,
  email: string
): Promise<
  ReturnType<RecoverResponseHelpers[keyof RecoverResponseHelpers]>
> => {
  if (!config.email) {
    return res.badEndpoint()
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
