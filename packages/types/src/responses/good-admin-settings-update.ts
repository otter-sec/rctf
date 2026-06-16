import { z } from 'zod/mini'
import { response } from '../internal'
import { AdminSettingsSchema } from './good-admin-settings'

export const GoodAdminSettingsUpdate = response('goodAdminSettingsUpdate', {
  status: 200,
  message: 'Settings successfully updated.',
  data: z.object({
    overrides: AdminSettingsSchema.check(
      z.describe('Operator-set values overriding the defaults.')
    ),
    defaults: AdminSettingsSchema.check(z.describe('Built-in default values.')),
  }),
})
