import { z } from 'zod/mini'
import { ProtectedAction } from '../../enums'
import { defineRoute } from '../../internal'
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
  BadRecaptchaCode,
  BadRegistrationsDisabled,
  BadToken,
  BadTokenVerification,
  BadUnknownEmail,
  BadUnknownUser,
  GoodEmailSet,
  GoodLogin,
  GoodRegister,
  GoodToken,
  GoodVerify,
  GoodVerifySent,
} from '../../responses'
import { UserEmail, UserName } from '../../util'

export const RegisterRoute = defineRoute({
  path: '/v1/auth/register',
  method: 'POST',
  captchaAction: ProtectedAction.Register,
  body: z
    .object({
      email: z
        .optional(UserEmail)
        .check(z.describe('Required when `ctftimeToken` is omitted.')),
      name: UserName,
      ctftimeToken: z
        .optional(z.string())
        .check(
          z.describe(
            'Required when `email` is omitted. Only usable when CTFtime auth is configured.'
          )
        ),
      recaptchaCode: z
        .optional(z.string())
        .check(
          z.describe('Checked only when captcha protects `register{:ts}`.')
        ),
    })
    .check(
      z.superRefine((data, ctx) => {
        if (!data.email && !data.ctftimeToken) {
          ctx.addIssue({
            code: 'custom',
            message: 'Either email or ctftimeToken must be provided.',
            path: ['email'],
          })
        }
      })
    ),
  goodResponses: [GoodVerifySent, GoodRegister],
  badResponses: [
    BadCtftimeToken,
    BadEmail,
    BadName,
    BadCompetitionNotAllowed,
    BadKnownCtftimeId,
    BadKnownEmail,
    BadKnownName,
    BadRegistrationsDisabled,
    BadRecaptchaCode,
    BadEndpoint,
  ],
  authRequired: false,
})

export const LoginRoute = defineRoute({
  path: '/v1/auth/login',
  method: 'POST',
  body: z
    .object({
      teamToken: z
        .optional(z.string())
        .check(z.describe('Required when `ctftimeToken` is omitted.')),
      ctftimeToken: z
        .optional(z.string())
        .check(z.describe('Required when `teamToken` is omitted.')),
    })
    .check(
      z.superRefine((data, ctx) => {
        if (!data.teamToken && !data.ctftimeToken) {
          ctx.addIssue({
            code: 'custom',
            message: 'Either teamToken or ctftimeToken must be provided.',
            path: ['teamToken'],
          })
        }
      })
    ),
  goodResponses: [GoodLogin],
  badResponses: [BadUnknownUser, BadTokenVerification, BadCtftimeToken],
  authRequired: false,
})

export const RecoverRoute = defineRoute({
  path: '/v1/auth/recover',
  method: 'POST',
  captchaAction: ProtectedAction.Recover,
  body: z.object({
    email: UserEmail.check(z.describe('Recovery destination.')),
    recaptchaCode: z
      .optional(z.string())
      .check(z.describe('Checked only when captcha protects `recover{:ts}`.')),
  }),
  goodResponses: [GoodVerifySent],
  badResponses: [BadEndpoint, BadEmail, BadUnknownEmail, BadRecaptchaCode],
  authRequired: false,
})

export const VerifyRoute = defineRoute({
  path: '/v1/auth/verify',
  method: 'POST',
  body: z.object({
    verifyToken: z
      .string()
      .check(z.describe('Pending-registration, team, or verify token.')),
  }),
  goodResponses: [GoodVerify, GoodEmailSet, GoodRegister],
  badResponses: [
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
  goodResponses: [GoodToken],
  badResponses: [BadToken],
  authRequired: true,
})
