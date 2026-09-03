import {
  AdminBotJobStatus,
  BadInstancerError,
  GetAdminBotJobHistoryRouteV2,
  GetAdminBotJobStatusRouteV2,
  GetAdminChallengeSolvesRouteV2,
  GetAdminInstanceStatusRouteV2,
  GetChallengeScoresRouteV2,
  GetChallengeSolvesRouteV2,
  GetChallengesRouteV2,
  GetInstanceStatusRouteV2,
  GoodAdminBotJobHistory,
  GoodAdminBotJobStatus,
  GoodChallengeScoresV2,
  GoodChallengeSolvesV2,
  GoodChallengesV2,
  GoodInstanceStatus,
} from '@rctf/types'
import {
  createInfiniteQuery,
  createQuery,
  keepPreviousData,
  queryOptions,
  type QueryClient,
} from '@tanstack/svelte-query'
import { apiRequest } from '$lib/api'
import { ApiError, unwrapData } from '$lib/query/core'
import { queryKeys } from '$lib/query/keys'
import { instancePollInterval } from '$lib/utils/instancer'

const INFINITE_PAGE_SIZE = 100

const SELF_SOLVES_PARAMS = { limit: 10, offset: 0 }

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
    return unwrapData(response, GoodChallengesV2)
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
      return unwrapData(response, GoodChallengeScoresV2)
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
      return unwrapData(response, GoodChallengeSolvesV2)
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
  admin: () => boolean = () => false
) {
  return createInfiniteQuery(() => {
    const challengeId = id()
    const isAdmin = admin()
    return {
      queryKey: isAdmin
        ? queryKeys.adminChallengeSolvesInfinite(challengeId ?? '')
        : queryKeys.challengeSolvesInfinite(challengeId ?? ''),
      queryFn: async ({ pageParam }) => {
        const args = {
          id: challengeId!,
          limit: INFINITE_PAGE_SIZE,
          offset: pageParam,
        }
        const response = isAdmin
          ? await apiRequest(GetAdminChallengeSolvesRouteV2, args)
          : await apiRequest(GetChallengeSolvesRouteV2, args)
        return {
          ...unwrapData(response, GoodChallengeSolvesV2),
          offset: pageParam,
        }
      },
      enabled: !!challengeId,
      initialPageParam: 0,
      getNextPageParam: lastPage =>
        getNextOffset(lastPage.offset, lastPage.solves.length, lastPage.total),
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
        return {
          ...unwrapData(response, GoodChallengeScoresV2),
          offset: pageParam,
        }
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

export function challengeInstanceQueryOptions(
  id: string | null,
  enabled: boolean,
  admin = false
) {
  return queryOptions({
    queryKey: admin
      ? queryKeys.adminChallengeInstance(id ?? '')
      : queryKeys.challengeInstance(id ?? ''),
    queryFn: async () => {
      const response = admin
        ? await apiRequest(GetAdminInstanceStatusRouteV2, { id: id! })
        : await apiRequest(GetInstanceStatusRouteV2, { id: id! })
      if (response.kind === GoodInstanceStatus.kind) {
        return response.data
      }
      const message =
        response.kind === BadInstancerError.kind
          ? response.data.message
          : response.message
      throw new ApiError(response.kind, message)
    },
    enabled: enabled && !!id,
    refetchInterval: query => instancePollInterval(query.state.data?.status),
  })
}

export function useChallengeInstance(
  id: () => string | null,
  enabled: () => boolean,
  admin: () => boolean = () => false
) {
  return createQuery(() =>
    challengeInstanceQueryOptions(id(), enabled(), admin())
  )
}

type AdminBotJobSnapshot = {
  id: string
  status: AdminBotJobStatus
}

const isAdminBotJobActive = (status: AdminBotJobStatus | undefined) =>
  status === AdminBotJobStatus.QUEUED || status === AdminBotJobStatus.RUNNING

const isAdminBotJobTerminal = (status: AdminBotJobStatus | undefined) =>
  status === AdminBotJobStatus.COMPLETED || status === AdminBotJobStatus.FAILED

export function didAdminBotJobBecomeTerminal(
  previous: AdminBotJobSnapshot | null,
  current: AdminBotJobSnapshot | null
): boolean {
  return (
    previous?.id === current?.id &&
    isAdminBotJobActive(previous?.status) &&
    isAdminBotJobTerminal(current?.status)
  )
}

export function adminBotStatusQueryOptions(
  id: string | null,
  enabled: boolean
) {
  return queryOptions({
    queryKey: queryKeys.challengeAdminBotStatus(id ?? ''),
    queryFn: async () => {
      const response = await apiRequest(GetAdminBotJobStatusRouteV2, {
        id: id!,
      })
      return unwrapData(response, GoodAdminBotJobStatus).job
    },
    enabled: enabled && !!id,
    refetchInterval: query =>
      isAdminBotJobActive(query.state.data?.status) ? 3000 : false,
  })
}

export function useAdminBotStatus(
  id: () => string | null,
  enabled: () => boolean
) {
  return createQuery(() => adminBotStatusQueryOptions(id(), enabled()))
}

export function adminBotHistoryQueryOptions(
  id: string | null,
  enabled: boolean
) {
  return queryOptions({
    queryKey: queryKeys.challengeAdminBotHistory(id ?? ''),
    queryFn: async () => {
      const response = await apiRequest(GetAdminBotJobHistoryRouteV2, {
        id: id!,
      })
      return unwrapData(response, GoodAdminBotJobHistory).jobs
    },
    enabled: enabled && !!id,
  })
}

export function useAdminBotHistory(
  id: () => string | null,
  enabled: () => boolean
) {
  return createQuery(() => adminBotHistoryQueryOptions(id(), enabled()))
}

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
