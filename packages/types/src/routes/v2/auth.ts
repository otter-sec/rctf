import { z } from 'zod/mini'
import { ProtectedAction } from '../../enums'
import { defineRoute } from '../../internal'
import {
  BadCaptcha,
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
  GoodRegisterV2,
  GoodVerify,
  GoodVerifyInfo,
  GoodVerifySent,
} from '../../responses'
import { UserEmail, UserName } from '../../util'

export const RegisterRouteV2 = defineRoute({
  path: '/v2/auth/register',
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
      captchaCode: z
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
  goodResponses: [GoodVerifySent, GoodRegisterV2],
  badResponses: [
    BadCompetitionNotAllowed,
    BadCtftimeToken,
    BadEmail,
    BadKnownCtftimeId,
    BadName,
    BadKnownName,
    BadKnownEmail,
    BadRegistrationsDisabled,
    BadCaptcha,
    BadEndpoint,
  ],
  authRequired: false,
})

export const VerifyRouteV2 = defineRoute({
  path: '/v2/auth/verify',
  method: 'POST',
  body: z.object({
    verifyToken: z
      .string()
      .check(z.describe('Pending-registration, team, or verify token.')),
  }),
  goodResponses: [GoodVerify, GoodEmailSet, GoodRegisterV2],
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

export const RecoverRouteV2 = defineRoute({
  path: '/v2/auth/recover',
  method: 'POST',
  captchaAction: ProtectedAction.Recover,
  body: z.object({
    email: UserEmail.check(z.describe('Recovery destination.')),
    captchaCode: z
      .optional(z.string())
      .check(z.describe('Checked only when captcha protects `recover{:ts}`.')),
  }),
  goodResponses: [GoodVerifySent],
  badResponses: [BadEndpoint, BadEmail, BadUnknownEmail, BadCaptcha],
  authRequired: false,
})

export const GetVerifyInfoRouteV2 = defineRoute({
  path: '/v2/auth/verify-info',
  method: 'GET',
  query: z.object({
    token: z
      .string()
      .check(z.describe('Pending-registration, team, or verify token.')),
  }),
  goodResponses: [GoodVerifyInfo],
  badResponses: [BadTokenVerification],
  authRequired: false,
})
