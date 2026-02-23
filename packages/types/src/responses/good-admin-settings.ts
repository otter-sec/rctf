import { z } from 'zod/mini'
import { response } from '../internal'

export const AdminSettingsSchema = z.object({
  ctfName: z.optional(z.string()),
  homeContent: z.optional(z.string()),
  sponsors: z.optional(
    z.array(
      z.object({
        name: z.string(),
        icon: z.string(),
        description: z.string(),
        small: z.optional(z.boolean()),
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
