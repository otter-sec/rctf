import { z } from 'zod/mini'
import { Permissions } from '../../enums'
import { defineRoute } from '../../internal'
import {
  BadBody,
  BadChallenge,
  BadNotStarted,
  BadSignature,
  GoodChallengeSolvesV2,
  GoodChallengesV2,
  GoodDynamicScores,
} from '../../responses'
import { DynamicScoresPayloadSchema } from '../../util/schemas'

export const GetChallengesRouteV2 = defineRoute({
  path: '/v2/challs',
  method: 'GET',
  goodResponses: [GoodChallengesV2],
  badResponses: [BadNotStarted],
  authRequired: false,
  optionalAuth: true,
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})

// intentionally has neither onlyWhenStarted nor onlyWhenNotFinished: a
// dynamic scoring backend must be able to seed scores before the event
// starts, and the leaderboard worker will drain any post-end deliveries into
// the final tally too
export const SubmitDynamicScoresRouteV2 = defineRoute({
  path: '/v2/challs/:id/scores',
  method: 'POST',
  goodResponses: [GoodDynamicScores],
  badResponses: [BadChallenge, BadSignature, BadBody],
  authRequired: false,
  serviceAuth: 'dynamicChallenge',
  params: z.object({
    id: z.string().check(z.describe('Challenge ID.')),
  }),
  body: DynamicScoresPayloadSchema,
})

export const GetChallengeSolvesRouteV2 = defineRoute({
  path: '/v2/challs/:id/solves',
  method: 'GET',
  goodResponses: [GoodChallengeSolvesV2],
  badResponses: [BadNotStarted, BadChallenge, BadBody],
  optionalAuth: true,
  params: z.object({
    id: z.string().check(z.describe('Challenge ID.')),
  }),
  query: z.object({
    // NOTE: Has max limits that are loaded from config
    limit: z
      .pipe(z.coerce.number(), z.int())
      .check(z.gte(1))
      .check(z.describe('Integer `>= 1`. Maximum enforced by config.')),
    offset: z
      .pipe(z.coerce.number(), z.int())
      .check(z.gte(0))
      .check(z.describe('Integer `>= 0`.')),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})
