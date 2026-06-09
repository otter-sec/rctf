import { z } from 'zod/mini'
import { response } from '../internal'
import { NumericString, omitWhenNull } from '../util'

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
        url: z.optional(z.string()),
      })
    ),
    globalSiteTag: omitWhenNull(z.string()),
    ctfName: z.string(),
    divisions: z.record(z.string(), z.string()),
    defaultDivision: omitWhenNull(z.string()),
    origin: z.string(),
    startTime: z.int(),
    endTime: z.int(),
    userMembers: z.boolean(),
    faviconUrl: omitWhenNull(z.string()),
    emailEnabled: z.boolean(),
    registrationsEnabled: omitWhenNull(z.boolean()),
    ctftime: omitWhenNull(
      z.object({
        clientId: NumericString,
      })
    ),
    recaptcha: omitWhenNull(
      z.object({
        siteKey: z.string(),
        protectedActions: z.array(z.string()),
      })
    ),
  }),
})
