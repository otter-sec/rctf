import { z } from 'zod'

import { response } from '../dsl'

export const GoodMemberCreate = response('goodMemberCreate', {
  status: 200,
  message: 'Team member successfully created.',
  data: z.object({
    id: z.string(),
    userid: z.string(),
    email: z.string(),
  }),
})
