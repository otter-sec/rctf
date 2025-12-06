import { z } from 'zod'
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
  BadUnknownEmail,
  GoodRegister,
  GoodVerifySent,
} from '../../responses'
import { UserEmail, UserName } from '../../util'

export const RegisterRouteV2 = defineRoute({
  path: '/v2/auth/register',
  method: 'POST',
  captchaAction: ProtectedAction.Register,
  body: z
    .object({
      email: UserEmail.optional(),
      name: UserName,
      ctftimeToken: z.string().optional(),
      captchaCode: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (!data.email && !data.ctftimeToken) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Either email or ctftimeToken must be provided.',
          path: ['email'],
        })
      }
    }),
  responses: [
    GoodVerifySent,
    GoodRegister,
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

export const RecoverRouteV2 = defineRoute({
  path: '/v2/auth/recover',
  method: 'POST',
  captchaAction: ProtectedAction.Recover,
  body: z.object({
    email: UserEmail,
    captchaCode: z.string().optional(),
  }),
  responses: [
    GoodVerifySent,
    BadEndpoint,
    BadEmail,
    BadUnknownEmail,
    BadCaptcha,
  ],
  authRequired: false,
})
