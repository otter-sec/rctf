import { z } from 'zod'
import { Permissions } from '../../enums'
import { defineRoute } from '../../internal'
import {
  BadAlreadySolvedChallenge,
  BadBody,
  BadChallenge,
  BadEnded,
  BadFlag,
  BadNotStarted,
  BadRateLimit,
  BadToken,
  BadUnknownUser,
  GoodChallenges,
  GoodChallengeSolves,
  GoodFlag,
} from '../../responses'

// TODO(es3n1n): i dont like the idea of loginwalling challenges
export const GetChallengesRoute = defineRoute({
  path: '/v1/challs',
  method: 'GET',
  responses: [GoodChallenges, BadNotStarted, BadToken],
  authRequired: true,
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})

export const SubmitFlagRoute = defineRoute({
  path: '/v1/challs/:id/submit',
  method: 'POST',
  body: z.object({
    flag: z.string(),
  }),
  responses: [
    GoodFlag,
    BadFlag,
    BadNotStarted,
    BadEnded,
    BadChallenge,
    BadRateLimit,
    BadAlreadySolvedChallenge,
    BadUnknownUser,
    BadToken,
  ],
  authRequired: true,
  params: z.object({
    id: z.string(),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsWrite,
  onlyWhenNotFinished: true,
})

export const GetChallengeSolvesRoute = defineRoute({
  path: '/v1/challs/:id/solves',
  method: 'GET',
  responses: [
    GoodChallengeSolves,
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
