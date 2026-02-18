import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodAdminBotStatus = response('goodAdminBotStatus', {
  status: 200,
  message: 'The admin bot status was retrieved successfully.',
  data: z.object({
    enabled: z.boolean(),
    configLanguage: z.string(),
  }),
})
