import {
  GetLeaderboardChallengesRouteV2,
  GetLeaderboardGraphRouteV2,
  GetLeaderboardRouteV2,
  GetLeaderboardWithGraphRoute,
  GoodLeaderboardChallengesV2,
  GoodLeaderboardGraph,
  GoodLeaderboardV2,
  GoodLeaderboardWithGraph,
  type RouteResponseData,
} from '@rctf/types'
import {
  createInfiniteQuery,
  createQuery,
  keepPreviousData,
  queryOptions,
} from '@tanstack/svelte-query'
import { apiRequest } from '$lib/api'
import { getNextOffset } from '$lib/query/challenges'
import { ApiError, unwrapData } from '$lib/query/core'
import { queryKeys } from '$lib/query/keys'
import { getCategoryKeyOrAlias } from '$lib/utils/categories'

const INFINITE_PAGE_SIZE = 100
const RATE_LIMIT_RETRY_DELAY_MS = 3000
const RATE_LIMIT_RETRY_COUNT = 3

export function shouldRetryLeaderboard(
  failureCount: number,
  error: Error
): boolean {
  if (ApiError.isRateLimit(error)) {
    return failureCount < RATE_LIMIT_RETRY_COUNT
  }
  return !(error instanceof ApiError) && failureCount < 3
}

type LeaderboardWithGraphData = RouteResponseData<
  typeof GetLeaderboardWithGraphRoute
>

export type LeaderboardEntry = LeaderboardWithGraphData['leaderboard'][number]
export type LeaderboardGraphSeries = LeaderboardWithGraphData['graph'][number]
export type LeaderboardWithGraphPage = LeaderboardWithGraphData & {
  offset: number
}
export type LeaderboardFilters = {
  division?: string
  search?: string
  challenge?: string
}

export type LeaderboardParams = {
  limit: number
  offset: number
  division?: string
}

export function mergeLeaderboardPages<L, G>(
  pages: { total: number; leaderboard: L[]; graph: G[] }[]
): { total: number; leaderboard: L[]; graph: G[] } {
  return {
    total: pages.at(-1)?.total ?? 0,
    leaderboard: pages.flatMap(page => page.leaderboard),
    graph: pages.flatMap(page => page.graph),
  }
}

export function excludeSanityChallenges<T extends { category: string }>(
  challenges: Record<string, T>
): Record<string, T> {
  const result: Record<string, T> = {}
  for (const [id, challenge] of Object.entries(challenges)) {
    if (getCategoryKeyOrAlias(challenge.category) !== 'sanity') {
      result[id] = challenge
    }
  }
  return result
}

export function useLeaderboardWithGraph(filters: () => LeaderboardFilters) {
  return createInfiniteQuery(() => {
    const { division, search, challenge } = filters()
    return {
      queryKey: queryKeys.leaderboardWithGraph({ division, search, challenge }),
      queryFn: async ({ pageParam }) => {
        const response = await apiRequest(GetLeaderboardWithGraphRoute, {
          limit: INFINITE_PAGE_SIZE,
          offset: pageParam,
          ...(division !== undefined ? { division } : {}),
          ...(search !== undefined ? { search } : {}),
          ...(challenge !== undefined ? { challenge } : {}),
        })
        return {
          ...unwrapData(response, GoodLeaderboardWithGraph),
          offset: pageParam,
        }
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage: LeaderboardWithGraphPage) =>
        getNextOffset(
          lastPage.offset,
          lastPage.leaderboard.length,
          lastPage.total
        ),
      placeholderData: keepPreviousData,
      refetchInterval: 30 * 1000,
      retry: shouldRetryLeaderboard,
      retryDelay: RATE_LIMIT_RETRY_DELAY_MS,
    }
  })
}

export const leaderboardChallengesQueryOptions = queryOptions({
  queryKey: queryKeys.leaderboardChallenges,
  queryFn: async () => {
    const response = await apiRequest(GetLeaderboardChallengesRouteV2)
    return excludeSanityChallenges(
      unwrapData(response, GoodLeaderboardChallengesV2).challenges
    )
  },
  refetchInterval: 30 * 1000,
})

export function useLeaderboardChallenges() {
  return createQuery(() => leaderboardChallengesQueryOptions)
}

export function leaderboardQueryOptions(params: LeaderboardParams) {
  return queryOptions({
    queryKey: queryKeys.leaderboard(params),
    queryFn: async () => {
      const response = await apiRequest(GetLeaderboardRouteV2, params)
      return unwrapData(response, GoodLeaderboardV2)
    },
  })
}

export function useLeaderboard(params: () => LeaderboardParams) {
  return createQuery(() => leaderboardQueryOptions(params()))
}

export type GraphCachingPolicy = {
  refetchInterval: number | false
  staleTime?: number
}

const SELF_GRAPH_CACHING: GraphCachingPolicy = { refetchInterval: 30 * 1000 }

export const PUBLIC_GRAPH_CACHING: GraphCachingPolicy = {
  refetchInterval: false,
  staleTime: 5 * 60 * 1000,
}

export function selfUserGraphQueryOptions(
  globalPlace: number | null,
  userId: string | null,
  caching: GraphCachingPolicy = SELF_GRAPH_CACHING
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
    ...caching,
  })
}

export function useSelfUserGraph(
  globalPlace: () => number | null,
  userId: () => string | null,
  caching: GraphCachingPolicy = SELF_GRAPH_CACHING
) {
  return createQuery(() =>
    selfUserGraphQueryOptions(globalPlace(), userId(), caching)
  )
}
