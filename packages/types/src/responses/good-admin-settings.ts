import { z } from 'zod/mini'
import { response } from '../internal'

export const AdminSettingsSchema = z.object({
  ctfName: z.optional(z.string()),
  homeContent: z.optional(z.string()),
  startTime: z.optional(z.int()),
  endTime: z.optional(z.int()),
  sponsors: z.optional(
    z.array(
      z.object({
        name: z.string(),
        icon: z.string(),
        description: z.string(),
        url: z.optional(z.string()),
      })
    )
  ),
  meta: z.optional(
    z.object({
      description: z.optional(z.string()),
      imageUrl: z.optional(z.string()),
    })
  ),
  faviconUrl: z.optional(z.string()),
  logoLightUrl: z.optional(z.string()),
  logoDarkUrl: z.optional(z.string()),
})

const AdminSettingsResponseData = z.object({
  overrides: AdminSettingsSchema,
  defaults: AdminSettingsSchema,
})

export const GoodAdminSettings = response('goodAdminSettings', {
  status: 200,
  message: 'The retrieval of settings was successful.',
  data: AdminSettingsResponseData,
})
