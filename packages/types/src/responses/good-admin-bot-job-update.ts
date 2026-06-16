import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodAdminBotJobUpdate = response('goodAdminBotJobUpdate', {
  status: 200,
  message: 'The admin bot job was updated successfully.',
  data: z.object({
    ok: example(z.boolean(), true).check(
      z.describe('Whether the update was applied.')
    ),
  }),
})
