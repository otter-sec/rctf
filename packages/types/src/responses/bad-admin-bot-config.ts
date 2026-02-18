import { z } from 'zod/mini'
import { response } from '../internal'

export const BadAdminBotConfig = response('badAdminBotConfig', {
  status: 400,
  message: 'Invalid admin bot configuration.',
  data: z.object({
    error: z.string(),
  }),
})
