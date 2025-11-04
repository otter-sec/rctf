import { defineRoute } from '../dsl'
import { CtftimeCallbackBody } from '../models'
import {
  BadCtftimeCode,
  BadEndpoint,
  GoodClientConfig,
  GoodCtftimeLeaderboard,
  GoodCtftimeToken,
} from '../responses'

export const GetClientConfigRoute = defineRoute({
  path: '/integrations/client/config',
  method: 'GET',
  responses: [GoodClientConfig],
  authRequired: false,
})

export const GetCtftimeLeaderboardRoute = defineRoute({
  path: '/integrations/ctftime/leaderboard',
  method: 'GET',
  responses: [GoodCtftimeLeaderboard],
  authRequired: true,
})

export const CtftimeCallbackRoute = defineRoute({
  path: '/integrations/ctftime/callback',
  method: 'POST',
  body: CtftimeCallbackBody,
  responses: [GoodCtftimeToken, BadEndpoint, BadCtftimeCode],
  authRequired: false,
})
