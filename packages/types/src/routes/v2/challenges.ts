import { z } from 'zod'
import { Permissions } from '../../enums'
import { defineRoute } from '../../internal'
import {
  BadBody,
  BadChallenge,
  BadNotStarted,
  BadToken,
  GoodChallengesV2,
  GoodChallengeSolvesV2,
} from '../../responses'

// TODO(es3n1n): i dont like the idea of loginwalling challenges
export const GetChallengesRouteV2 = defineRoute({
  path: '/v2/challs',
  method: 'GET',
  responses: [GoodChallengesV2, BadNotStarted, BadToken],
  authRequired: true,
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})

export const GetChallengeSolvesRouteV2 = defineRoute({
  path: '/v2/challs/:id/solves',
  method: 'GET',
  responses: [
    GoodChallengeSolvesV2,
    BadNotStarted,
    BadChallenge,
    BadToken,
    BadBody,
  ],
  authRequired: true,
  params: z.object({
    id: z.string(),
  }),
  query: z.object({
    // NOTE: Has max limits that are loaded from config
    limit: z.coerce.number().int().min(1),
    offset: z.coerce.number().int().min(0),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})
