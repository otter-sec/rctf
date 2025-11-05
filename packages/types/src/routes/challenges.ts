import { z } from 'zod'

import { defineRoute } from '../dsl'
import { SubmitFlagBody } from '../models'
import {
  BadAlreadySolvedChallenge,
  BadChallenge,
  BadEnded,
  BadFlag,
  BadNotStarted,
  BadRateLimit,
  BadUnknownUser,
  GoodChallengeSolves,
  GoodChallenges,
  GoodFlag,
} from '../responses'

const ChallengeIdParams = z.object({
  id: z.string(),
})

const ChallengeSolvesQuery = z.object({
  limit: z.coerce.number().int().min(1),
  offset: z.coerce.number().int().min(0),
})

export const GetChallengesRoute = defineRoute({
  path: '/challs',
  method: 'GET',
  responses: [GoodChallenges, BadNotStarted],
  authRequired: true,
})

export const SubmitFlagRoute = defineRoute({
  path: '/challs/:id/submit',
  method: 'POST',
  body: SubmitFlagBody,
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
  params: ChallengeIdParams,
})

export const GetChallengeSolvesRoute = defineRoute({
  path: '/challs/:id/solves',
  method: 'GET',
  responses: [GoodChallengeSolves, BadNotStarted, BadChallenge],
  authRequired: false,
  params: ChallengeIdParams,
  query: ChallengeSolvesQuery,
})
