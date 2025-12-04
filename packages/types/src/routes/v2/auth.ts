import { z } from 'zod'
import { defineRoute } from '../../internal'
import {
  BadCompetitionNotAllowed,
  BadCtftimeToken,
  BadDiscordTokenV2,
  BadEmail,
  BadEndpoint,
  BadKnownCtftimeId,
  BadKnownEmail,
  BadKnownName,
  BadName,
  BadRegistrationsDisabled,
  BadTokenVerification,
  BadUnknownUser,
  GoodLogin,
  GoodRegister,
  GoodVerifySent,
} from '../../responses'
import { UserEmail, UserName } from '../../util'

export const RegisterRouteV2 = defineRoute({
  path: '/v2/auth/register',
  method: 'POST',
  body: z
    .object({
      email: UserEmail.optional(),
      name: UserName,
      ctftimeToken: z.string().optional(),
      discordToken: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (!data.email && !data.ctftimeToken && !data.discordToken) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'One of email, ctftimeToken or discordToken must be provided.',
          path: ['email'],
        })
      }
    }),
  responses: [
    GoodVerifySent,
    GoodRegister,
    BadCtftimeToken,
    BadDiscordTokenV2,
    BadEmail,
    BadName,
    BadCompetitionNotAllowed,
    BadKnownCtftimeId,
    BadKnownEmail,
    BadKnownName,
    BadRegistrationsDisabled,
    BadEndpoint,
  ],
  authRequired: false,
})

export const LoginRouteV2 = defineRoute({
  path: '/v2/auth/login',
  method: 'POST',
  body: z
    .object({
      teamToken: z.string().optional(),
      ctftimeToken: z.string().optional(),
      discordToken: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (!data.teamToken && !data.ctftimeToken && !data.discordToken) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'One of teamToken, ctftimeToken or discordToken must be provided.',
          path: ['teamToken'],
        })
      }
    }),
  responses: [GoodLogin, BadUnknownUser, BadTokenVerification, BadCtftimeToken, BadDiscordTokenV2],
  authRequired: false,
})