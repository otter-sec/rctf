import {
  DeleteChallengeRoute,
  DeleteChallengeSolveRouteV2,
  GetChallengeScoresRouteV2,
  GetChallengeSolvesRouteV2,
  GetChallengesRouteV2,
  GoodChallengeScoresV2,
  GoodChallengeSolvesV2,
  GoodChallengesV2,
  SubmitFlagRoute,
} from '@rctf/types'
import {
  createInfiniteQuery,
  createQuery,
  keepPreviousData,
  queryOptions,
} from '@tanstack/svelte-query'
import { apiRequest } from '$lib/api'
import { ApiError, createApiMutation } from './core'

export const challengesQueryOptions = queryOptions({
  queryKey: ['challenges'] as const,
  queryFn: async () => {
    const response = await apiRequest(GetChallengesRouteV2)
    if (response.kind === GoodChallengesV2.kind) {
      return response.data
    }
    throw new ApiError(response.kind, response.message)
  },
  refetchInterval: 30 * 1000,
})

export const challengeSolvesQueryOptions = (
  id: string,
  params: { limit: number; offset: number }
) =>
  queryOptions({
    queryKey: ['challenges', id, 'solves', params] as const,
    queryFn: async () => {
      const response = await apiRequest(GetChallengeSolvesRouteV2, {
        id,
        ...params,
      })
      if (response.kind === GoodChallengeSolvesV2.kind) {
        return response.data
      }
      throw new ApiError(response.kind, response.message)
    },
  })

export function useChallenges() {
  return createQuery(() => challengesQueryOptions)
}

export function useChallengeSolves(
  challengeId: () => string,
  params: () => { limit: number; offset: number }
) {
  return createQuery(() => challengeSolvesQueryOptions(challengeId(), params()))
}

export function useInfiniteChallengeSolves(
  challengeId: () => string | null,
  totalCount: () => number,
  pageSize = 100
) {
  return createInfiniteQuery(() => {
    const id = challengeId()
    return {
      queryKey: ['challenges', id, 'solves', 'infinite'] as const,
      queryFn: async ({ pageParam = 0 }) => {
        const response = await apiRequest(GetChallengeSolvesRouteV2, {
          id: id!,
          limit: pageSize,
          offset: pageParam,
        })
        if (response.kind === GoodChallengeSolvesV2.kind) {
          return { solves: response.data.solves, offset: pageParam }
        }
        throw new ApiError(response.kind, response.message)
      },
      enabled: !!id,
      initialPageParam: 0,
      getNextPageParam: lastPage => {
        const nextOffset = lastPage.offset + lastPage.solves.length
        return nextOffset < totalCount() ? nextOffset : undefined
      },
    }
  })
}

export const challengeScoresQueryOptions = (
  id: string,
  params: { limit: number; offset: number }
) =>
  queryOptions({
    queryKey: ['challenges', id, 'scores', params] as const,
    queryFn: async () => {
      const response = await apiRequest(GetChallengeScoresRouteV2, {
        id,
        ...params,
      })
      if (response.kind === GoodChallengeScoresV2.kind) {
        return response.data
      }
      throw new ApiError(response.kind, response.message)
    },
    refetchInterval: 30 * 1000,
  })

export function useChallengeScores(
  challengeId: () => string,
  params: () => { limit: number; offset: number }
) {
  return createQuery(() => challengeScoresQueryOptions(challengeId(), params()))
}

export function useInfiniteChallengeScores(
  challengeId: () => string | null,
  pageSize = 100
) {
  return createInfiniteQuery(() => {
    const id = challengeId()
    return {
      queryKey: ['challenges', id, 'scores', 'infinite'] as const,
      queryFn: async ({ pageParam = 0 }) => {
        const response = await apiRequest(GetChallengeScoresRouteV2, {
          id: id!,
          limit: pageSize,
          offset: pageParam,
        })
        if (response.kind === GoodChallengeScoresV2.kind) {
          return { ...response.data, offset: pageParam }
        }
        throw new ApiError(response.kind, response.message)
      },
      enabled: !!id,
      initialPageParam: 0,
      getNextPageParam: lastPage => {
        const nextOffset = lastPage.offset + lastPage.scores.length
        return nextOffset < lastPage.total ? nextOffset : undefined
      },
      placeholderData: keepPreviousData,
      staleTime: 30 * 1000,
    }
  })
}

export function useSubmitFlagMutation() {
  return createApiMutation(SubmitFlagRoute)
}

export function useDeleteChallengeMutation() {
  return createApiMutation(DeleteChallengeRoute)
}

export function useDeleteChallengeSolveMutation() {
  return createApiMutation(DeleteChallengeSolveRouteV2)
}
