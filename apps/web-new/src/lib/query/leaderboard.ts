import {
  GetLeaderboardGraphRouteV2,
  GetLeaderboardRouteV2,
  GoodLeaderboardGraph,
  GoodLeaderboardV2,
} from '@rctf/types'
import { createQuery, queryOptions } from '@tanstack/svelte-query'
import { apiRequest } from '$lib/api'
import { ApiError } from '$lib/query/core'
import { queryKeys } from '$lib/query/keys'

export type LeaderboardParams = {
  limit: number
  offset: number
  division?: string
}

export function leaderboardQueryOptions(params: LeaderboardParams) {
  return queryOptions({
    queryKey: queryKeys.leaderboard(params),
    queryFn: async () => {
      const response = await apiRequest(GetLeaderboardRouteV2, params)
      if (response.kind === GoodLeaderboardV2.kind) {
        return response.data
      }
      throw new ApiError(response.kind, response.message)
    },
  })
}

export function useLeaderboard(params: () => LeaderboardParams) {
  return createQuery(() => leaderboardQueryOptions(params()))
}

// offset = globalPlace - 1 until the API grows a per-team graph endpoint; the
// entry is validated against our own id in case the place shifted between
// /users/me and this request
export function selfUserGraphQueryOptions(
  globalPlace: number | null,
  userId: string | null
) {
  return queryOptions({
    queryKey: queryKeys.selfUserGraph(globalPlace, userId),
    queryFn: async () => {
      const response = await apiRequest(GetLeaderboardGraphRouteV2, {
        limit: 1,
        offset: (globalPlace ?? 1) - 1,
      })
      if (response.kind !== GoodLeaderboardGraph.kind) {
        return null
      }
      const entry = response.data.graph[0] ?? null
      if (!entry) {
        return null
      }
      return userId === null || entry.id === userId ? entry : null
    },
    enabled: globalPlace !== null && globalPlace >= 1,
    refetchInterval: 30 * 1000,
  })
}

export function useSelfUserGraph(
  globalPlace: () => number | null,
  userId: () => string | null
) {
  return createQuery(() => selfUserGraphQueryOptions(globalPlace(), userId()))
}
