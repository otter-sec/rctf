import { z } from 'zod/mini'
import { Permissions } from '../../enums'
import { defineRoute } from '../../internal'
import {
  BadBody,
  BadNotStarted,
  GoodLeaderboardGraph,
  GoodLeaderboardV2,
} from '../../responses'

export const GetLeaderboardRouteV2 = defineRoute({
  path: '/v2/leaderboard/now',
  method: 'GET',
  goodResponses: [GoodLeaderboardV2],
  badResponses: [BadNotStarted, BadBody],
  authRequired: false,
  query: z.object({
    // NOTE: Has max limits that are loaded from config
    limit: z.int().check(z.gte(1)),
    offset: z.int().check(z.gte(0)),
    division: z.optional(z.string()),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.leaderboardRead,
})

export const GetLeaderboardGraphRouteV2 = defineRoute({
  path: '/v2/leaderboard/graph',
  method: 'GET',
  goodResponses: [GoodLeaderboardGraph],
  badResponses: [BadNotStarted, BadBody],
  authRequired: false,
  query: z.object({
    // NOTE: Has max limit that is loaded from config
    limit: z.int().check(z.gte(1)),
    offset: z.int().check(z.gte(0)),
    division: z.optional(z.string()),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.leaderboardRead,
})
