import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodAdminUserV2 = response('goodAdminUser', {
  status: 200,
  message: 'The user was retrieved.',
  data: z.object({
    id: z.string(),
    name: z.string(),
    email: z.nullable(z.string()),
    division: z.string(),
    perms: z.int(),
    banned: z.boolean(),
    score: z.int(),
    solveCount: z.int(),
    avatarUrl: z.nullable(z.string()),
    countryCode: z.nullable(z.string()),
    statusText: z.nullable(z.string()),
    createdAt: z.string(),
    solves: z.array(
      z.object({
        challengeId: z.string(),
        challengeName: z.string(),
        challengeCategory: z.string(),
        createdAt: z.string(),
      })
    ),
  }),
})
