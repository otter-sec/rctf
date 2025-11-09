import { z } from 'zod'
import { defineRoute } from '../internal'
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
import { UserEmail, UserName } from '../util'

export const RegisterRoute = defineRoute({
  path: '/v1/auth/register',
  method: 'POST',
  body: z
    .object({
      email: UserEmail.optional(),
      name: UserName,
      ctftimeToken: z.string().optional(),
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
  body: z
    .object({
      teamToken: z.string().optional(),
      ctftimeToken: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (!data.teamToken && !data.ctftimeToken) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Either teamToken or ctftimeToken must be provided.',
          path: ['teamToken'],
        })
      }
    }),
  responses: [GoodLogin, BadUnknownUser, BadTokenVerification, BadCtftimeToken],
  authRequired: false,
})

export const RecoverRoute = defineRoute({
  path: '/v1/auth/recover',
  method: 'POST',
  body: z.object({
    email: UserEmail,
  }),
  responses: [GoodVerifySent, BadEndpoint, BadEmail, BadUnknownEmail],
  authRequired: false,
})

export const VerifyRoute = defineRoute({
  path: '/v1/auth/verify',
  method: 'POST',
  body: z.object({
    verifyToken: z.string(),
  }),
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
