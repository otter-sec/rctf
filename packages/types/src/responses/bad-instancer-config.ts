import { z } from 'zod/mini'
import { response } from '../internal'

export const BadInstancerConfig = response('badInstancerConfig', {
  status: 400,
  message: 'Invalid instancer configuration.',
  data: z.object({
    error: z.string(),
  }),
})
