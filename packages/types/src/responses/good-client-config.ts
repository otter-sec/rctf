import { z } from 'zod/mini'
import { response } from '../internal'
import { NumericString } from '../util'

export const GoodClientConfig = response('goodClientConfig', {
  status: 200,
  message: 'The client config was retrieved.',
  data: z.object({
    meta: z.object({
      description: z.string(),
      imageUrl: z.string(),
    }),
    homeContent: z.string(),
    sponsors: z.array(
      z.object({
        name: z.string(),
        icon: z.string(),
        description: z.string(),
        small: z.optional(z.boolean()),
      })
    ),
    globalSiteTag: z.nullish(z.string()),
    ctfName: z.string(),
    divisions: z.record(z.string(), z.string()),
    defaultDivision: z.nullish(z.string()),
    origin: z.string(),
    startTime: z.int(),
    endTime: z.int(),
    userMembers: z.boolean(),
    faviconUrl: z.nullable(z.string()),
    emailEnabled: z.boolean(),
    registrationsEnabled: z.nullable(z.boolean()),
    ctftime: z.nullable(
      z.object({
        clientId: NumericString,
      })
    ),
    recaptcha: z.nullable(
      z.object({
        siteKey: z.string(),
        protectedActions: z.array(z.string()),
      })
    ),
  }),
})
