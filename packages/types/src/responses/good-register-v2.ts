import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodRegisterV2 = response('goodRegisterV2', {
  status: 200,
  message: 'The user was created.',
  data: z.object({
    authToken: example(z.string(), '<auth-token>').check(
      z.describe('Bearer token authenticating the new session.')
    ),
    teamToken: example(z.string(), '<team-token>').check(
      z.describe('Token used to invite teammates to the team.')
    ),
  }),
})
