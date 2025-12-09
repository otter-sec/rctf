import { z } from 'zod/mini'
import { Permissions } from '../../enums/permissions'
import { defineRoute } from '../../internal'
import {
  BadCtftimeCode,
  BadEndpoint,
  BadPerms,
  BadToken,
  GoodClientConfig,
  GoodCtftimeLeaderboard,
  GoodCtftimeToken,
} from '../../responses'

export const GetClientConfigRoute = defineRoute({
  path: '/v1/integrations/client/config',
  method: 'GET',
  goodResponses: [GoodClientConfig],
  authRequired: false,
})

export const GetCtftimeLeaderboardRoute = defineRoute({
  path: '/v1/integrations/ctftime/leaderboard',
  method: 'GET',
  goodResponses: [GoodCtftimeLeaderboard],
  badResponses: [BadPerms, BadToken],
  authRequired: true,
  permissions: Permissions.leaderboardRead,
  returnBodyAsIs: true,
})

export const CtftimeCallbackRoute = defineRoute({
  path: '/v1/integrations/ctftime/callback',
  method: 'POST',
  body: z.object({
    ctftimeCode: z.string(),
  }),
  goodResponses: [GoodCtftimeToken],
  badResponses: [BadEndpoint, BadCtftimeCode],
  authRequired: false,
})
