import { config } from '@rctf/config'
import type { DatabaseClient, User } from '@rctf/db'
import type {
  BadCompetitionNotAllowed,
  BadCtftimeToken,
  BadEmailChangeDivision,
  BadEndpoint,
  BadKnownCtftimeId,
  BadKnownEmail,
  BadKnownName,
  BadRegistrationsDisabled,
  BadTokenVerification,
  BadUnknownUser,
  GoodEmailSet,
  GoodRegister,
  GoodRegisterV2,
  GoodVerify,
  GoodVerifySent,
  ResponseHelpers,
} from '@rctf/types'
import {
  checkLoginVerification,
  createLoginVerification,
} from '../cache/auth-cache'
import type { TypedRedis } from '../cache/scripts'
import {
  createToken,
  parseToken,
  parseTokenWithMultipleKinds,
  TokenKind,
} from '../lib/tokens'
import { allowedDivisions, divisionAllowed } from '../util/acl'
import { sendVerificationEmail } from './emails'
import {
  createUser,
  createUserV2,
  getUser,
  getUserByEmail,
  getUserByNameOrEmail,
  updateUserEmail,
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

type VerifyResponseHelpers = ResponseHelpers<
  [
    typeof BadTokenVerification,
    typeof BadEmailChangeDivision,
    typeof BadKnownCtftimeId,
    typeof BadKnownEmail,
    typeof BadKnownName,
    typeof BadUnknownUser,
    typeof GoodVerify,
    typeof GoodEmailSet,
    typeof GoodRegister,
  ]
>

type VerifyV2ResponseHelpers = ResponseHelpers<
  [
    typeof BadTokenVerification,
    typeof BadEmailChangeDivision,
    typeof BadKnownCtftimeId,
    typeof BadKnownEmail,
    typeof BadKnownName,
    typeof BadUnknownUser,
    typeof GoodVerify,
    typeof GoodEmailSet,
    typeof GoodRegisterV2,
  ]
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
type VerifyResult = ReturnType<
  VerifyResponseHelpers[keyof VerifyResponseHelpers]
>
type VerifyV2Result = ReturnType<
  VerifyV2ResponseHelpers[keyof VerifyV2ResponseHelpers]
>

type RegisterSharedResponseHelpers = Pick<
  RegisterResponseHelpers,
  | 'badRegistrationsDisabled'
  | 'badEndpoint'
  | 'badCompetitionNotAllowed'
  | 'badKnownName'
  | 'badKnownEmail'
  | 'goodVerifySent'
  | 'badCtftimeToken'
>
type RegisterSharedResult = ReturnType<
  RegisterSharedResponseHelpers[keyof RegisterSharedResponseHelpers]
>

const registerUserInternal = async <
  TCreateResult extends RegisterResult | RegisterV2Result,
>(
  res: RegisterSharedResponseHelpers,
  db: DatabaseClient,
  redis: TypedRedis,
  body: RegisterUserBody,
  create: (user: UserToCreate) => Promise<TCreateResult>
): Promise<RegisterSharedResult | TCreateResult> => {
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
      return res.badCtftimeToken()
    }

    userToCreate.ctftimeId = ctftimeToken.ctftimeId
  }

  // Registration without any verification, or if ctftime token was successfully resolved:
  return await create(userToCreate)
}

export const registerUser = async (
  res: RegisterResponseHelpers,
  db: DatabaseClient,
  redis: TypedRedis,
  body: RegisterUserBody
): Promise<RegisterResult> => {
  return await registerUserInternal(res, db, redis, body, user =>
    createUser(res, db, user)
  )
}

export const registerUserV2 = async (
  res: RegisterV2ResponseHelpers,
  db: DatabaseClient,
  redis: TypedRedis,
  body: RegisterUserBody
): Promise<RegisterV2Result> => {
  return await registerUserInternal(res, db, redis, body, user =>
    createUserV2(res, db, user)
  )
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

type VerifySharedResponseHelpers = Pick<
  VerifyResponseHelpers,
  | 'badTokenVerification'
  | 'badUnknownUser'
  | 'goodVerify'
  | 'badEmailChangeDivision'
  | 'badKnownEmail'
  | 'goodEmailSet'
>
type VerifySharedResult = ReturnType<
  VerifySharedResponseHelpers[keyof VerifySharedResponseHelpers]
>

const verifyUserInternal = async <
  TCreateResult extends VerifyResult | VerifyV2Result,
>(
  res: VerifySharedResponseHelpers,
  db: DatabaseClient,
  redis: TypedRedis,
  verifyToken: string,
  create: (user: UserToCreate) => Promise<TCreateResult>
): Promise<VerifySharedResult | TCreateResult> => {
  const result = await parseTokenWithMultipleKinds(
    [TokenKind.Verify, TokenKind.Team],
    verifyToken
  )
  if (!result) {
    return res.badTokenVerification()
  }

  const [kind, data] = result

  if (kind === TokenKind.Team) {
    const user = await getUser(db, data)
    if (!user) {
      return res.badUnknownUser()
    }

    const authToken = await createToken(TokenKind.Auth, user.id)
    return res.goodVerify({ authToken })
  }

  const tokenUnused = await checkLoginVerification(redis, data.verifyId)
  if (!tokenUnused) {
    return res.badTokenVerification()
  }

  if (data.kind === 'register') {
    return await create({
      division: data.division,
      email: data.email,
      name: data.name,
      ctftimeId: null,
    })
  }

  if (data.kind === 'update') {
    const user = await getUser(db, data.userId)
    if (!user) {
      return res.badUnknownUser()
    }

    if (!divisionAllowed(data.email, user.division)) {
      return res.badEmailChangeDivision()
    }

    return await updateUserEmail(res, db, redis, data.userId, {
      email: data.email,
    })
  }

  const unreachable: never = data
  throw new Error(
    `Unsupported verification kind: ${JSON.stringify(unreachable)}`
  )
}

export const verifyUser = async (
  res: VerifyResponseHelpers,
  db: DatabaseClient,
  redis: TypedRedis,
  verifyToken: string
): Promise<VerifyResult> => {
  return await verifyUserInternal(res, db, redis, verifyToken, user =>
    createUser(res, db, user)
  )
}

export const verifyUserV2 = async (
  res: VerifyV2ResponseHelpers,
  db: DatabaseClient,
  redis: TypedRedis,
  verifyToken: string
): Promise<VerifyV2Result> => {
  return await verifyUserInternal(res, db, redis, verifyToken, user =>
    createUserV2(res, db, user)
  )
}
