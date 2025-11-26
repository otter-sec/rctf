import { z } from 'zod'
import { Permissions } from '../enums'
import { defineRoute } from '../internal'
import {
  BadBody,
  BadNotStarted,
  GoodLeaderboard,
  GoodLeaderboardGraph,
} from '../responses'

export const GetLeaderboardRoute = defineRoute({
  path: '/v1/leaderboard/now',
  method: 'GET',
  responses: [GoodLeaderboard, BadNotStarted, BadBody],
  authRequired: false,
  query: z.object({
    // NOTE: Has max limits that are loaded from config
    limit: z.coerce.number().int().min(1),
    offset: z.coerce.number().int().min(0),
    division: z.string().optional(),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.leaderboardRead,
})

export const GetLeaderboardGraphRoute = defineRoute({
  path: '/v1/leaderboard/graph',
  method: 'GET',
  responses: [GoodLeaderboardGraph, BadNotStarted, BadBody],
  authRequired: false,
  query: z.object({
    // NOTE: Has max limit that is loaded from config
    limit: z.coerce.number().int().min(1),
    division: z.string().optional(),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.leaderboardRead,
})
