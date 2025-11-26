import {
  GetLeaderboardGraphRoute,
  GetLeaderboardRoute,
  GoodLeaderboard,
  GoodLeaderboardGraph,
} from '@rctf/types'
import { apiRequest } from '$lib'
import type { PageLoad } from './$types'

export const ssr = false

const PAGE_SIZE = 100

export const load: PageLoad = async () => {
  const [leaderboardResponse, graphResponse] = await Promise.all([
    apiRequest(GetLeaderboardRoute, {
      limit: PAGE_SIZE,
      offset: 0,
      division: 'open',
    }),
    apiRequest(GetLeaderboardGraphRoute, {
      limit: 10,
      division: 'open',
    }),
  ])

  if (leaderboardResponse.kind !== GoodLeaderboard.kind) {
    return {
      leaderboard: null,
      graph: null,
      error: leaderboardResponse.message,
    }
  }

  const graph =
    graphResponse.kind === GoodLeaderboardGraph.kind
      ? graphResponse.data.graph
      : null

  return {
    leaderboard: leaderboardResponse.data,
    graph,
    pageSize: PAGE_SIZE,
  }
}
