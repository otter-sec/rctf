import { defineRoute } from '../internal'
import { LoginBody, RecoverBody, RegisterBody, VerifyBody } from '../models'
import {
  BadCompetitionNotAllowed,
  BadCtftimeToken,
  BadEmail,
  BadEmailChangeDivision,
  BadEndpoint,
  BadKnownCtftimeId,
  BadKnownEmail,
  BadKnownName,
  BadName,
  BadRegistrationsDisabled,
  BadTokenVerification,
  BadUnknownEmail,
  BadUnknownUser,
  GoodEmailSet,
  GoodLogin,
  GoodRegister,
  GoodToken,
  GoodVerify,
  GoodVerifySent,
} from '../responses'

export const RegisterRoute = defineRoute({
  path: '/v1/auth/register',
  method: 'POST',
  body: RegisterBody,
  responses: [
    GoodVerifySent,
    GoodRegister,
    BadCtftimeToken,
    BadEmail,
    BadName,
    BadCompetitionNotAllowed,
    BadKnownCtftimeId,
    BadKnownEmail,
    BadKnownName,
    BadRegistrationsDisabled,
  ],
  authRequired: false,
})

export const LoginRoute = defineRoute({
  path: '/v1/auth/login',
  method: 'POST',
  body: LoginBody,
  responses: [GoodLogin, BadUnknownUser, BadTokenVerification, BadCtftimeToken],
  authRequired: false,
})

export const RecoverRoute = defineRoute({
  path: '/v1/auth/recover',
  method: 'POST',
  body: RecoverBody,
  responses: [GoodVerifySent, BadEndpoint, BadEmail, BadUnknownEmail],
  authRequired: false,
})

export const VerifyRoute = defineRoute({
  path: '/v1/auth/verify',
  method: 'POST',
  body: VerifyBody,
  responses: [
    GoodVerify,
    GoodEmailSet,
    GoodRegister,
    BadTokenVerification,
    BadEmailChangeDivision,
    BadKnownCtftimeId,
    BadKnownEmail,
    BadKnownName,
    BadUnknownUser,
  ],
  authRequired: false,
})

export const TestAuthRoute = defineRoute({
  path: '/v1/auth/test',
  method: 'GET',
  responses: [GoodToken],
  authRequired: true,
})
