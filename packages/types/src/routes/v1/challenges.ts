import { z } from 'zod/mini'
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

export const GetChallengesRoute = defineRoute({
  path: '/v1/challs',
  method: 'GET',
  goodResponses: [GoodChallenges],
  badResponses: [BadNotStarted],
  authRequired: false,
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})

export const SubmitFlagRoute = defineRoute({
  path: '/v1/challs/:id/submit',
  method: 'POST',
  body: z.object({
    flag: z.string(),
  }),
  goodResponses: [GoodFlag],
  badResponses: [
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
  goodResponses: [GoodChallengeSolves],
  badResponses: [BadNotStarted, BadChallenge, BadBody],
  authRequired: false,
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
