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
  BadPerms,
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
    flag: z
      .string()
      .check(z.maxLength(1024))
      .check(z.describe('Maximum length `1024`.')),
  }),
  goodResponses: [GoodFlag],
  badResponses: [
    BadFlag,
    BadPerms,
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
    id: z.string().check(z.describe('Challenge ID.')),
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
