import { z } from 'zod'

import { defineRoute } from '../dsl'
import {
  BadNotStarted,
  GoodLeaderboard,
  GoodLeaderboardGraph,
} from '../responses'

const LeaderboardNowQuery = z.object({
  limit: z.coerce.number().int().min(0),
  offset: z.coerce.number().int().min(0),
  division: z.string().optional(),
})

const LeaderboardGraphQuery = z.object({
  limit: z.coerce.number().int().min(1),
  division: z.string().optional(),
})

export const GetLeaderboardRoute = defineRoute({
  path: '/leaderboard/now',
  method: 'GET',
  responses: [GoodLeaderboard, BadNotStarted],
  authRequired: false,
  query: LeaderboardNowQuery,
})

export const GetLeaderboardGraphRoute = defineRoute({
  path: '/leaderboard/graph',
  method: 'GET',
  responses: [GoodLeaderboardGraph, BadNotStarted],
  authRequired: false,
  query: LeaderboardGraphQuery,
})
