import { z } from 'zod'
import { Permissions } from '../../enums'
import { defineRoute } from '../../internal'
import { BadBody, BadNotStarted, GoodLeaderboardV2 } from '../../responses'

export const GetLeaderboardRouteV2 = defineRoute({
  path: '/v2/leaderboard/now',
  method: 'GET',
  responses: [GoodLeaderboardV2, BadNotStarted, BadBody],
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
