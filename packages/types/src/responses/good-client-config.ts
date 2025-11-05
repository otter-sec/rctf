import { z } from 'zod'

import { response } from '../internal'

export const GoodClientConfig = response('goodClientConfig', {
  status: 200,
  message: 'The client config was retrieved.',
  data: z
    .object({
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
      globalSiteTag: z.string().optional(),
      ctfName: z.string(),
      divisions: z.record(z.string()),
      defaultDivision: z.string().optional(),
      origin: z.string(),
      startTime: z.number().int(),
      endTime: z.number().int(),
      userMembers: z.boolean(),
      faviconUrl: z.string().optional(),
      emailEnabled: z.boolean(),
      registrationsEnabled: z.boolean().optional(),
      ctftime: z
        .object({
          clientId: z.string(),
        })
        .optional(),
    })
    .passthrough(),
})
