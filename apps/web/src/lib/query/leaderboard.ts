import {
  GetLeaderboardChallengesRouteV2,
  GetLeaderboardGraphRouteV2,
  GetLeaderboardRouteV2,
  GetLeaderboardWithGraphRoute,
  GoodLeaderboardChallengesV2,
  GoodLeaderboardGraph,
  GoodLeaderboardV2,
  GoodLeaderboardWithGraph,
} from '@rctf/types'
import {
  createInfiniteQuery,
  createQuery,
  queryOptions,
} from '@tanstack/svelte-query'
import { apiRequest } from '$lib/api'
import { ApiError } from './core'

export const leaderboardQueryOptions = (params: {
  limit: number
  offset: number
  division?: string
}) =>
  queryOptions({
    queryKey: ['leaderboard', params] as const,
    queryFn: async () => {
      const response = await apiRequest(GetLeaderboardRouteV2, params)
      if (response.kind === GoodLeaderboardV2.kind) {
        return response.data
      }
      throw new ApiError(response.kind, response.message)
    },
    refetchOnWindowFocus: true,
  })

export const leaderboardChallengesQueryOptions = queryOptions({
  queryKey: ['leaderboard', 'challenges'] as const,
  queryFn: async () => {
    const response = await apiRequest(GetLeaderboardChallengesRouteV2)
    if (response.kind === GoodLeaderboardChallengesV2.kind) {
      return response.data.challenges
    }
    throw new ApiError(response.kind, response.message)
  },
  refetchOnWindowFocus: true,
  refetchInterval: 30 * 1000,
})

export const leaderboardGraphQueryOptions = (params: {
  limit: number
  offset: number
  division?: string
}) =>
  queryOptions({
    queryKey: ['leaderboard', 'graph', params] as const,
    queryFn: async () => {
      const response = await apiRequest(GetLeaderboardGraphRouteV2, params)
      if (response.kind === GoodLeaderboardGraph.kind) {
        return response.data.graph
      }
      throw new ApiError(response.kind, response.message)
    },
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000,
  })

export const leaderboardWithGraphQueryOptions = (params: {
  limit: number
  offset: number
  division?: string
}) =>
  queryOptions({
    queryKey: ['leaderboard', 'with-graph', params] as const,
    queryFn: async () => {
      const response = await apiRequest(GetLeaderboardWithGraphRoute, params)
      if (response.kind === GoodLeaderboardWithGraph.kind) {
        return response.data
      }
      throw new ApiError(response.kind, response.message)
    },
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000,
  })

export const selfUserGraphQueryOptions = (globalPlace: number | null) =>
  queryOptions({
    queryKey: ['leaderboard', 'graph', 'self', globalPlace] as const,
    queryFn: async () => {
      if (globalPlace === null || globalPlace < 1) return null
      const response = await apiRequest(GetLeaderboardGraphRouteV2, {
        limit: 1,
        offset: globalPlace - 1,
      })
      if (response.kind === GoodLeaderboardGraph.kind) {
        return response.data.graph[0] ?? null
      }
      return null
    },
    enabled: globalPlace !== null && globalPlace >= 1,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000,
  })

export const userGraphQueryOptions = (
  userId: string,
  globalPlace: number | null
) =>
  queryOptions({
    queryKey: ['leaderboard', 'graph', 'user', userId, globalPlace] as const,
    queryFn: async () => {
      if (globalPlace === null || globalPlace < 1) return null
      const response = await apiRequest(GetLeaderboardGraphRouteV2, {
        limit: 1,
        offset: globalPlace - 1,
      })
      if (response.kind === GoodLeaderboardGraph.kind) {
        return response.data.graph[0] ?? null
      }
      return null
    },
    enabled: globalPlace !== null && globalPlace >= 1,
    staleTime: 1000 * 60 * 5,
  })

export function useLeaderboard(
  params: () => {
    limit: number
    offset: number
    division?: string
  }
) {
  return createQuery(() => leaderboardQueryOptions(params()))
}

export function useLeaderboardWithGraph(
  params: () => {
    limit: number
    offset: number
    division?: string
  }
) {
  return createQuery(() => leaderboardWithGraphQueryOptions(params()))
}

export function useInfiniteLeaderboardWithGraph(
  params: () => {
    pageSize: number
    division?: string
  }
) {
  return createInfiniteQuery(() => {
    const p = params()
    return {
      queryKey: ['leaderboard', 'graph', 'infinite', p] as const,
      queryFn: async ({ pageParam = 0 }) => {
        const response = await apiRequest(GetLeaderboardWithGraphRoute, {
          limit: p.pageSize,
          offset: pageParam,
          division: p.division,
        })
        if (response.kind === GoodLeaderboardWithGraph.kind) {
          return { ...response.data, offset: pageParam }
        }
        throw new ApiError(response.kind, response.message)
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage, _allPages) => {
        const nextOffset = lastPage.offset + lastPage.leaderboard.length
        return nextOffset < lastPage.total ? nextOffset : undefined
      },
      refetchOnWindowFocus: true,
      refetchInterval: 30 * 1000,
    }
  })
}

export function useTopGraphData(
  params: () => { limit?: number; division?: string }
) {
  return createQuery(() => {
    const p = params()
    return leaderboardGraphQueryOptions({
      limit: p.limit ?? 10,
      offset: 0,
      division: p.division,
    })
  })
}

export function useLeaderboardChallenges() {
  return createQuery(() => leaderboardChallengesQueryOptions)
}

export function useSelfUserGraph(globalPlace: () => number | null) {
  return createQuery(() => selfUserGraphQueryOptions(globalPlace()))
}

export function useUserGraph(
  userId: () => string,
  globalPlace: () => number | null
) {
  return createQuery(() => userGraphQueryOptions(userId(), globalPlace()))
}
