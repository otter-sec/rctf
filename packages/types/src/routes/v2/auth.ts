import { z } from 'zod/mini'
import { ProtectedAction } from '../../enums'
import { defineRoute } from '../../internal'
import {
  BadCaptcha,
  BadCompetitionNotAllowed,
  BadCtftimeToken,
  BadEmail,
  BadEndpoint,
  BadKnownCtftimeId,
  BadKnownEmail,
  BadKnownName,
  BadName,
  BadRegistrationsDisabled,
  BadTokenVerification,
  BadUnknownEmail,
  GoodRegisterV2,
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
      email: z.optional(UserEmail),
      name: UserName,
      ctftimeToken: z.optional(z.string()),
      captchaCode: z.optional(z.string()),
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

export const RegisterVerifyRouteV2 = defineRoute({
  path: '/v2/auth/register/verify',
  method: 'POST',
  body: z.object({
    verifyToken: z.string(),
  }),
  goodResponses: [GoodRegisterV2],
  badResponses: [
    BadTokenVerification,
    BadKnownCtftimeId,
    BadKnownEmail,
    BadKnownName,
  ],
  authRequired: false,
})

export const RecoverRouteV2 = defineRoute({
  path: '/v2/auth/recover',
  method: 'POST',
  captchaAction: ProtectedAction.Recover,
  body: z.object({
    email: UserEmail,
    captchaCode: z.optional(z.string()),
  }),
  goodResponses: [GoodVerifySent],
  badResponses: [BadEndpoint, BadEmail, BadUnknownEmail, BadCaptcha],
  authRequired: false,
})

export const GetVerifyInfoRouteV2 = defineRoute({
  path: '/v2/auth/verify-info',
  method: 'GET',
  query: z.object({
    token: z.string(),
  }),
  goodResponses: [GoodVerifyInfo],
  badResponses: [BadTokenVerification],
  authRequired: false,
})
