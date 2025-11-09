import { z } from 'zod'
import { defineRoute } from '../internal'
import {
  BadNotStarted,
  GoodLeaderboard,
  GoodLeaderboardGraph,
} from '../responses'

export const GetLeaderboardRoute = defineRoute({
  path: '/v1/leaderboard/now',
  method: 'GET',
  responses: [GoodLeaderboard, BadNotStarted],
  authRequired: false,
  query: z.object({
    limit: z.coerce.number().int().min(0),
    offset: z.coerce.number().int().min(0),
    division: z.string().optional(),
  }),
})

export const GetLeaderboardGraphRoute = defineRoute({
  path: '/v1/leaderboard/graph',
  method: 'GET',
  responses: [GoodLeaderboardGraph, BadNotStarted],
  authRequired: false,
  query: z.object({
    limit: z.coerce.number().int().min(1),
    division: z.string().optional(),
  }),
})
