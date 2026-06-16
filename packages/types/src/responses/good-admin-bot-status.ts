import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodAdminBotStatus = response('goodAdminBotStatus', {
  status: 200,
  message: 'The admin bot status was retrieved successfully.',
  data: z.object({
    enabled: example(z.boolean(), true).check(
      z.describe('Whether the admin bot is enabled.')
    ),
    configLanguage: example(z.string(), 'javascript').check(
      z.describe('Scripting language used for admin-bot configs.')
    ),
  }),
})
