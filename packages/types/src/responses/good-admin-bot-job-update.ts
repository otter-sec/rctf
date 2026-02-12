import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodAdminBotJobUpdate = response('goodAdminBotJobUpdate', {
  status: 200,
  message: 'The admin bot job was updated successfully.',
  data: z.object({
    ok: z.boolean(),
  }),
})
