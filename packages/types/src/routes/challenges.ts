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
})

export const GetChallengeSolvesRoute = defineRoute({
  path: '/challs/:id/solves',
  method: 'GET',
  responses: [GoodChallengeSolves, BadNotStarted, BadChallenge],
  authRequired: false,
})
