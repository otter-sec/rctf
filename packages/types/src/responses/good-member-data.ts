import { z } from 'zod'

import { response } from '../internal'

export const GoodMemberData = response('goodMemberData', {
  status: 200,
  message: 'The team member data was successfully retrieved.',
  data: z.array(
    z.object({
      id: z.string(),
      userid: z.string(),
      email: z.string(),
    })
  ),
})
