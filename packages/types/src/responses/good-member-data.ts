import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodMemberData = response('goodMemberData', {
  status: 200,
  message: 'The team member data was successfully retrieved.',
  data: z.array(
    z.object({
      id: example(z.string(), 'member-1a2b3c').check(
        z.describe('Membership ID.')
      ),
      userid: example(z.string(), 'user-4d5e6f').check(
        z.describe('User ID of the team member.')
      ),
      email: example(z.string(), 'member@osec.io').check(
        z.describe('Member email address.')
      ),
    })
  ),
})
