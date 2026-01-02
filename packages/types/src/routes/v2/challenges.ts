import { z } from 'zod/mini'
import { Permissions } from '../../enums'
import { defineRoute } from '../../internal'
import {
  BadBody,
  BadChallenge,
  BadNotStarted,
  GoodChallengeSolvesV2,
  GoodChallengesV2,
} from '../../responses'

export const GetChallengesRouteV2 = defineRoute({
  path: '/v2/challs',
  method: 'GET',
  goodResponses: [GoodChallengesV2],
  badResponses: [BadNotStarted],
  authRequired: false,
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})

export const GetChallengeSolvesRouteV2 = defineRoute({
  path: '/v2/challs/:id/solves',
  method: 'GET',
  goodResponses: [GoodChallengeSolvesV2],
  badResponses: [BadNotStarted, BadChallenge, BadBody],
  optionalAuth: true,
  params: z.object({
    id: z.string(),
  }),
  query: z.object({
    // NOTE: Has max limits that are loaded from config
    limit: z.pipe(z.coerce.number(), z.int()).check(z.gte(1)),
    offset: z.pipe(z.coerce.number(), z.int()).check(z.gte(0)),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})
