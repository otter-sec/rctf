import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodRegisterV2 = response('goodRegister', {
  status: 200,
  message: 'The user was created.',
  data: z.object({
    authToken: z.string(),
    teamToken: z.string(),
  }),
})
