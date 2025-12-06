import { z } from 'zod'
import { response } from '../internal'
import { NumericString } from '../util'

export const GoodClientConfigV2 = response('goodClientConfig', {
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
        small: z.boolean().optional(),
      })
    ),
    globalSiteTag: z.string().nullish(),
    ctfName: z.string(),
    divisions: z.record(z.string()),
    defaultDivision: z.string().nullish(),
    origin: z.string(),
    startTime: z.number().int(),
    endTime: z.number().int(),
    userMembers: z.boolean(),
    faviconUrl: z.string().nullable(),
    emailEnabled: z.boolean(),
    registrationsEnabled: z.boolean().nullable(),
    ctftime: z
      .object({
        clientId: NumericString,
      })
      .nullable(),
    instancerEnabled: z.boolean(),
    captcha: z
      .object({
        provider: z.string(),
        publicOptions: z.record(z.string(), z.string()),
        protectedEndpoints: z.object({
          register: z.boolean(),
          recover: z.boolean(),
          setEmail: z.boolean(),
          instancerStart: z.boolean(),
          instancerExtend: z.boolean(),
          avatarUpload: z.boolean(),
        }),
      })
      .nullable(),
  }),
})
