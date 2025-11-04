import { defineRoute } from '../dsl'
import {
  BadNotStarted,
  GoodLeaderboard,
  GoodLeaderboardGraph,
} from '../responses'

export const GetLeaderboardRoute = defineRoute({
  path: '/leaderboard/now',
  method: 'GET',
  responses: [GoodLeaderboard, BadNotStarted],
  authRequired: false,
})

export const GetLeaderboardGraphRoute = defineRoute({
  path: '/leaderboard/graph',
  method: 'GET',
  responses: [GoodLeaderboardGraph, BadNotStarted],
  authRequired: false,
})
