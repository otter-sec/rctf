import { z } from 'zod/mini'
import { ProtectedAction } from '../enums'
import { response } from '../internal'
import { NumericString } from '../util'

export const GoodClientConfigV2 = response('goodClientConfigV2', {
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
    flagFormatPlaceholder: z.string(),
    analytics: z.nullable(
      z.object({
        provider: z.string(),
        publicOptions: z.record(z.string(), z.string()),
      })
    ),
    ctfName: z.string(),
    divisions: z.record(z.string(), z.string()),
    defaultDivision: z.nullish(z.string()),
    origin: z.string(),
    startTime: z.int(),
    endTime: z.int(),
    userMembers: z.boolean(),
    faviconUrl: z.nullable(z.string()),
    logoLightUrl: z.nullable(z.string()),
    logoDarkUrl: z.nullable(z.string()),
    emailEnabled: z.boolean(),
    registrationsEnabled: z.nullable(z.boolean()),
    ctftime: z.nullable(
      z.object({
        clientId: NumericString,
      })
    ),
    instancerEnabled: z.boolean(),
    isArchived: z.boolean(),
    captcha: z.nullable(
      z.object({
        provider: z.string(),
        publicOptions: z.record(z.string(), z.string()),
        protectedEndpoints: z.record(z.enum(ProtectedAction), z.boolean()),
      })
    ),
  }),
})
