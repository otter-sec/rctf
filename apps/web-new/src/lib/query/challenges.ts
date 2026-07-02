import {
  GetChallengeScoresRouteV2,
  GetChallengeSolvesRouteV2,
  GetChallengesRouteV2,
  GoodChallengeScoresV2,
  GoodChallengeSolvesV2,
  GoodChallengesV2,
} from '@rctf/types'
import {
  createInfiniteQuery,
  createQuery,
  keepPreviousData,
  queryOptions,
  type QueryClient,
} from '@tanstack/svelte-query'
import { apiRequest } from '$lib/api'
import { ApiError } from '$lib/query/core'
import { queryKeys } from '$lib/query/keys'

const INFINITE_PAGE_SIZE = 100

// A short window of recent solves is enough to render the podium (top three)
// and read back the caller's own placement/time from the same response.
const SELF_SOLVES_PARAMS = { limit: 10, offset: 0 }

/**
 * Unions the caller's server-side solves with locally-tracked optimistic solves
 * into a single set of solved challenge IDs.
 *
 * @param selfSolves - The caller's solves from `/users/me`, or null/undefined
 *   before that query resolves.
 * @param localSolvedIds - Challenge IDs marked solved this session, before the
 *   server round-trip lands.
 */
export function deriveSolvedIds(
  selfSolves: { id: string }[] | null | undefined,
  localSolvedIds: ReadonlySet<string>
): Set<string> {
  const solvedIds = new Set<string>(localSolvedIds)
  for (const solve of selfSolves ?? []) {
    solvedIds.add(solve.id)
  }
  return solvedIds
}

/**
 * Buckets the caller's first-blood placements into gold/silver/bronze sets of
 * challenge IDs from `bloodIndex` (0/1/2). Any other index is ignored.
 *
 * @param selfSolves - The caller's solves, or null/undefined before load.
 */
export function deriveBloodIds(
  selfSolves: { id: string; bloodIndex: number | null }[] | null | undefined
): { gold: Set<string>; silver: Set<string>; bronze: Set<string> } {
  const gold = new Set<string>()
  const silver = new Set<string>()
  const bronze = new Set<string>()
  for (const solve of selfSolves ?? []) {
    if (solve.bloodIndex === 0) {
      gold.add(solve.id)
    } else if (solve.bloodIndex === 1) {
      silver.add(solve.id)
    } else if (solve.bloodIndex === 2) {
      bronze.add(solve.id)
    }
  }
  return { gold, silver, bronze }
}

/**
 * Computes the next page offset for an infinite solves/scores query, or
 * undefined once every row has been fetched.
 *
 * @param lastOffset - Offset the last page was fetched at.
 * @param lastPageCount - Number of rows the last page returned.
 * @param total - Total rows available for the challenge.
 */
export function getNextOffset(
  lastOffset: number,
  lastPageCount: number,
  total: number
): number | undefined {
  const nextOffset = lastOffset + lastPageCount
  return nextOffset < total ? nextOffset : undefined
}

export const challengesQueryOptions = queryOptions({
  queryKey: queryKeys.challenges,
  queryFn: async () => {
    const response = await apiRequest(GetChallengesRouteV2)
    if (response.kind === GoodChallengesV2.kind) {
      return response.data
    }
    throw new ApiError(response.kind, response.message)
  },
  refetchInterval: 30 * 1000,
})

export function useChallenges() {
  return createQuery(() => challengesQueryOptions)
}

export function challengeScoresQueryOptions(
  id: string | null,
  params: { limit: number; offset: number }
) {
  return queryOptions({
    queryKey: queryKeys.challengeScores(id ?? '', params),
    queryFn: async () => {
      const response = await apiRequest(GetChallengeScoresRouteV2, {
        id: id!,
        ...params,
      })
      if (response.kind === GoodChallengeScoresV2.kind) {
        return response.data
      }
      throw new ApiError(response.kind, response.message)
    },
    enabled: !!id,
    refetchInterval: 30 * 1000,
  })
}

export function useChallengeScores(
  id: () => string | null,
  params: () => { limit: number; offset: number }
) {
  return createQuery(() => challengeScoresQueryOptions(id(), params()))
}

export function challengeSolvesSelfQueryOptions(id: string | null) {
  return queryOptions({
    queryKey: queryKeys.challengeSolves(id ?? '', SELF_SOLVES_PARAMS),
    queryFn: async () => {
      const response = await apiRequest(GetChallengeSolvesRouteV2, {
        id: id!,
        ...SELF_SOLVES_PARAMS,
      })
      if (response.kind === GoodChallengeSolvesV2.kind) {
        return response.data
      }
      throw new ApiError(response.kind, response.message)
    },
    enabled: !!id,
    refetchInterval: 30 * 1000,
  })
}

export function useChallengeSolvesSelf(id: () => string | null) {
  return createQuery(() => challengeSolvesSelfQueryOptions(id()))
}

export function useChallengeSolvesInfinite(
  id: () => string | null,
  total: () => number
) {
  return createInfiniteQuery(() => {
    const challengeId = id()
    return {
      queryKey: queryKeys.challengeSolvesInfinite(challengeId ?? ''),
      queryFn: async ({ pageParam }) => {
        const response = await apiRequest(GetChallengeSolvesRouteV2, {
          id: challengeId!,
          limit: INFINITE_PAGE_SIZE,
          offset: pageParam,
        })
        if (response.kind === GoodChallengeSolvesV2.kind) {
          return { ...response.data, offset: pageParam }
        }
        throw new ApiError(response.kind, response.message)
      },
      enabled: !!challengeId,
      initialPageParam: 0,
      getNextPageParam: lastPage =>
        getNextOffset(lastPage.offset, lastPage.solves.length, total()),
    }
  })
}

export function useChallengeScoresInfinite(id: () => string | null) {
  return createInfiniteQuery(() => {
    const challengeId = id()
    return {
      queryKey: queryKeys.challengeScoresInfinite(challengeId ?? ''),
      queryFn: async ({ pageParam }) => {
        const response = await apiRequest(GetChallengeScoresRouteV2, {
          id: challengeId!,
          limit: INFINITE_PAGE_SIZE,
          offset: pageParam,
        })
        if (response.kind === GoodChallengeScoresV2.kind) {
          return { ...response.data, offset: pageParam }
        }
        throw new ApiError(response.kind, response.message)
      },
      enabled: !!challengeId,
      initialPageParam: 0,
      getNextPageParam: lastPage =>
        getNextOffset(lastPage.offset, lastPage.scores.length, lastPage.total),
      placeholderData: keepPreviousData,
      staleTime: 30 * 1000,
    }
  })
}

/**
 * Applies an optimistic solve, then reconciles caches once the server's
 * leaderboard worker has had time to catch up.
 *
 * @param queryClient - The active query client.
 * @param challengeId - The challenge that was just solved.
 * @param markSolved - Records the solve locally so the UI updates immediately.
 */
export function invalidateAfterSolve(
  queryClient: QueryClient,
  challengeId: string,
  markSolved: (id: string) => void
): void {
  markSolved(challengeId)

  // FIXME(es3n1n): Small delay to allow the server's leaderboard worker to update the cache
  setTimeout(() => {
    queryClient.refetchQueries({ queryKey: queryKeys.challenges, exact: true })
    queryClient.refetchQueries({ queryKey: queryKeys.userSelf, exact: true })
    queryClient.invalidateQueries({ queryKey: queryKeys.fullLeaderboard })
    queryClient.invalidateQueries({
      queryKey: queryKeys.challenge(challengeId),
    })
  }, 500)
}
