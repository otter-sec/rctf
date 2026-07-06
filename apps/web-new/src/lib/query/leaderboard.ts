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
import { ApiError } from '$lib/query/core'
import { queryKeys } from '$lib/query/keys'
import { getCategoryKeyOrAlias } from '$lib/utils/categories'

const INFINITE_PAGE_SIZE = 100

type LeaderboardWithGraphData = RouteResponseData<
  typeof GetLeaderboardWithGraphRoute
>

export type LeaderboardEntry = LeaderboardWithGraphData['leaderboard'][number]
export type LeaderboardGraphSeries = LeaderboardWithGraphData['graph'][number]
export type LeaderboardWithGraphPage = LeaderboardWithGraphData & {
  offset: number
}
export type LeaderboardChallenges = RouteResponseData<
  typeof GetLeaderboardChallengesRouteV2
>['challenges']

export type LeaderboardFilters = {
  division?: string
  search?: string
}

export type LeaderboardParams = {
  limit: number
  offset: number
  division?: string
}

/**
 * Flattens infinite `with-graph` pages into a single board, concatenating the
 * per-page `leaderboard` and `graph` arrays in page order so rows and series
 * stay aligned. `total` comes from the most recent page.
 */
export function mergeLeaderboardPages<L, G>(
  pages: { total: number; leaderboard: L[]; graph: G[] }[]
): { total: number; leaderboard: L[]; graph: G[] } {
  return {
    total: pages.at(-1)?.total ?? 0,
    leaderboard: pages.flatMap(page => page.leaderboard),
    graph: pages.flatMap(page => page.graph),
  }
}

/**
 * Removes sanity-category challenges from the leaderboard-challenges metadata,
 * preserving the insertion order of the remaining entries.
 */
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
    const { division, search } = filters()
    return {
      queryKey: queryKeys.leaderboardWithGraph({ division, search }),
      queryFn: async ({ pageParam }) => {
        const response = await apiRequest(GetLeaderboardWithGraphRoute, {
          limit: INFINITE_PAGE_SIZE,
          offset: pageParam,
          ...(division !== undefined ? { division } : {}),
          ...(search !== undefined ? { search } : {}),
        })
        if (response.kind === GoodLeaderboardWithGraph.kind) {
          return { ...response.data, offset: pageParam }
        }
        throw new ApiError(response.kind, response.message)
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
    }
  })
}

export const leaderboardChallengesQueryOptions = queryOptions({
  queryKey: queryKeys.leaderboardChallenges,
  queryFn: async () => {
    const response = await apiRequest(GetLeaderboardChallengesRouteV2)
    if (response.kind === GoodLeaderboardChallengesV2.kind) {
      return excludeSanityChallenges(response.data.challenges)
    }
    throw new ApiError(response.kind, response.message)
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

/**
 * Caching policy for the offset-hack graph query. Own-profile usage polls every
 * 30s; public-profile usage drops the poll and lets the entry go stale over five
 * minutes, since another team's rank is effectively static for a page view.
 */
export type GraphCachingPolicy = {
  refetchInterval: number | false
  staleTime?: number
}

const SELF_GRAPH_CACHING: GraphCachingPolicy = { refetchInterval: 30 * 1000 }

export const PUBLIC_GRAPH_CACHING: GraphCachingPolicy = {
  refetchInterval: false,
  staleTime: 5 * 60 * 1000,
}

// offset = globalPlace - 1 until the API grows a per-team graph endpoint; the
// entry is validated against our own id in case the place shifted between
// /users/me and this request
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
