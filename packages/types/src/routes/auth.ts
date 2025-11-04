import { defineRoute } from '../dsl'
import {
  LoginBody,
  RecoverBody,
  RegisterBody,
  VerifyBody,
} from '../models/auth'
import {
  BadCompetitionNotAllowed,
  BadCtftimeToken,
  BadEmail,
  BadEmailChangeDivision,
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
  path: '/auth/register',
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
  path: '/auth/login',
  method: 'POST',
  body: LoginBody,
  responses: [GoodLogin, BadUnknownUser, BadTokenVerification, BadCtftimeToken],
  authRequired: false,
})

export const RecoverRoute = defineRoute({
  path: '/auth/recover',
  method: 'POST',
  body: RecoverBody,
  responses: [GoodVerifySent, BadEmail, BadUnknownEmail],
  authRequired: false,
})

export const VerifyRoute = defineRoute({
  path: '/auth/verify',
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
  path: '/auth/test',
  method: 'GET',
  responses: [GoodToken],
  authRequired: true,
})
