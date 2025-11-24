import { z } from 'zod'
import { Permissions } from '../enums/permissions'
import { defineRoute } from '../internal'
import {
  BadCtftimeCode,
  BadEndpoint,
  BadPerms,
  GoodClientConfig,
  GoodCtftimeLeaderboard,
  GoodCtftimeToken,
} from '../responses'

export const GetClientConfigRoute = defineRoute({
  path: '/v1/integrations/client/config',
  method: 'GET',
  responses: [GoodClientConfig],
  authRequired: false,
})

export const GetCtftimeLeaderboardRoute = defineRoute({
  path: '/v1/integrations/ctftime/leaderboard',
  method: 'GET',
  responses: [GoodCtftimeLeaderboard, BadPerms],
  authRequired: true,
  permissions: Permissions.leaderboardRead,
})

export const CtftimeCallbackRoute = defineRoute({
  path: '/v1/integrations/ctftime/callback',
  method: 'POST',
  body: z.object({
    ctftimeCode: z.string(),
  }),
  responses: [GoodCtftimeToken, BadEndpoint, BadCtftimeCode],
  authRequired: false,
})
