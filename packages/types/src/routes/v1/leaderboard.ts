import { z } from 'zod/mini'
import { Permissions } from '../../enums'
import { defineRoute } from '../../internal'
import {
  BadBody,
  BadNotStarted,
  GoodLeaderboard,
  GoodLeaderboardGraph,
} from '../../responses'

export const GetLeaderboardRoute = defineRoute({
  path: '/v1/leaderboard/now',
  method: 'GET',
  goodResponses: [GoodLeaderboard],
  badResponses: [BadNotStarted, BadBody],
  authRequired: false,
  query: z.object({
    // NOTE: Has max limits that are loaded from config
    limit: z.pipe(z.coerce.number(), z.int()).check(z.gte(1)),
    offset: z.pipe(z.coerce.number(), z.int()).check(z.gte(0)),
    division: z.optional(z.string()),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.leaderboardRead,
})

export const GetLeaderboardGraphRoute = defineRoute({
  path: '/v1/leaderboard/graph',
  method: 'GET',
  goodResponses: [GoodLeaderboardGraph],
  badResponses: [BadNotStarted, BadBody],
  authRequired: false,
  query: z.object({
    // NOTE: Has max limit that is loaded from config
    limit: z.pipe(z.coerce.number(), z.int()).check(z.gte(1)),
    division: z.optional(z.string()),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.leaderboardRead,
})
