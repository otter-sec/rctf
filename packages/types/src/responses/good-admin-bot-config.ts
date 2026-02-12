import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodAdminBotConfig = response('goodAdminBotConfig', {
  status: 200,
  message: 'The admin bot config was retrieved successfully.',
  data: z.object({
    sourceCode: z.string(),
    fileExtension: z.string(),
  }),
})
