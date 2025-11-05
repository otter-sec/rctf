import { Permissions } from '../enums/permissions'
import { defineRoute } from '../internal'
import { CtftimeCallbackBody } from '../models'
import {
  BadCtftimeCode,
  BadEndpoint,
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
  responses: [GoodCtftimeLeaderboard],
  authRequired: true,
  permissions: Permissions.leaderboardRead,
})

export const CtftimeCallbackRoute = defineRoute({
  path: '/v1/integrations/ctftime/callback',
  method: 'POST',
  body: CtftimeCallbackBody,
  responses: [GoodCtftimeToken, BadEndpoint, BadCtftimeCode],
  authRequired: false,
})
