import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodAdminUsersV2 = response('goodAdminUsers', {
  status: 200,
  message: 'The users were retrieved.',
  data: z.object({
    total: z.int(),
    users: z.array(
      z.object({
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
      })
    ),
  }),
})
