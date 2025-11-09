import { z } from 'zod'
import { defineRoute } from '../internal'
import {
  BadAlreadySolvedChallenge,
  BadChallenge,
  BadEnded,
  BadFlag,
  BadNotStarted,
  BadRateLimit,
  BadUnknownUser,
  GoodChallenges,
  GoodChallengeSolves,
  GoodFlag,
} from '../responses'

// TODO(es3n1n): i dont like the idea of loginwalling challenges
export const GetChallengesRoute = defineRoute({
  path: '/v1/challs',
  method: 'GET',
  responses: [GoodChallenges, BadNotStarted],
  authRequired: true,
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
  ],
  authRequired: true,
  params: z.object({
    id: z.string(),
  }),
})

export const GetChallengeSolvesRoute = defineRoute({
  path: '/v1/challs/:id/solves',
  method: 'GET',
  responses: [GoodChallengeSolves, BadNotStarted, BadChallenge],
  authRequired: false,
  params: z.object({
    id: z.string(),
  }),
  query: z.object({
    limit: z.coerce.number().int().min(1),
    offset: z.coerce.number().int().min(0),
  }),
})
