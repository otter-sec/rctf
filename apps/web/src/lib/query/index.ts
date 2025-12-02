import {
  BadToken,
  CreateMemberRoute,
  CtftimeCallbackRoute,
  DeleteChallengeRoute,
  DeleteEmailRoute,
  DeleteMemberRoute,
  GetAdminChallengeRoute,
  GetAdminChallengesRoute,
  GetChallengeSolvesRouteV2,
  GetChallengesRoute,
  GetClientConfigRoute,
  GetLeaderboardGraphRoute,
  GetLeaderboardRouteV2,
  GetMembersRoute,
  GetUserRouteV2,
  GetUserSelfRouteV2,
  GoodAdminChallenge,
  GoodAdminChallenges,
  GoodChallenges,
  GoodChallengeSolvesV2,
  GoodClientConfig,
  GoodLeaderboardGraph,
  GoodLeaderboardV2,
  GoodMemberData,
  GoodUserDataV2,
  GoodUserSelfDataV2,
  LoginRoute,
  RecoverRoute,
  RegisterRoute,
  SetEmailRoute,
  SubmitFlagRoute,
  UpdateChallengeRoute,
  UpdateUserRouteV2,
  UploadFilesRoute,
  VerifyRoute,
  type AnyRouteDefinition,
  type RouteResponse,
} from '@rctf/types'
import {
  createMutation,
  createQuery,
  QueryClient,
  queryOptions,
} from '@tanstack/svelte-query'
import { browser } from '$app/environment'
import { apiRequest, isAuthenticated, type InlineArgs } from '$lib/api'

export { QueryClientProvider } from '@tanstack/svelte-query'

class ApiError extends Error {
  constructor(public override readonly message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        enabled: browser,
        staleTime: 1000 * 60,
        retry: (failureCount, error) => {
          if (error?.name === 'ApiError') {
            return false
          }
          return failureCount < 3
        },
      },
    },
  })
}

export const clientConfigQueryOptions = queryOptions({
  queryKey: ['clientConfig'] as const,
  queryFn: async () => {
    const response = await apiRequest(GetClientConfigRoute)
    if (response.kind === GoodClientConfig.kind) {
      return response.data
    }
    throw new ApiError(response.message)
  },
  staleTime: Infinity,
})

export const userSelfQueryOptions = queryOptions({
  queryKey: ['user', 'self'] as const,
  queryFn: async () => {
    if (!isAuthenticated()) {
      return null
    }
    const response = await apiRequest(GetUserSelfRouteV2)
    if (response.kind === GoodUserSelfDataV2.kind) {
      return response.data
    }
    return null
  },
  staleTime: 1000 * 60 * 5,
})

export const userByIdQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['user', id] as const,
    queryFn: async () => {
      const response = await apiRequest(GetUserRouteV2, { id })
      if (response.kind === GoodUserDataV2.kind) {
        return response.data
      }
      throw new ApiError(response.message)
    },
  })

export const challengesQueryOptions = queryOptions({
  queryKey: ['challenges'] as const,
  queryFn: async () => {
    const response = await apiRequest(GetChallengesRoute)
    if (response.kind === GoodChallenges.kind) {
      return response.data
    }
    if (response.kind === BadToken.kind) {
      throw new ApiError('You need to be logged in to view challenges')
    }
    throw new ApiError(response.message)
  },
  refetchInterval: 30 * 1000,
})

export const adminChallengesQueryOptions = queryOptions({
  queryKey: ['admin', 'challenges'] as const,
  queryFn: async () => {
    const response = await apiRequest(GetAdminChallengesRoute)
    if (response.kind === GoodAdminChallenges.kind) {
      return response.data
    }
    throw new ApiError(response.message)
  },
})

export const adminChallengeQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['admin', 'challenges', id] as const,
    queryFn: async () => {
      const response = await apiRequest(GetAdminChallengeRoute, { id })
      if (response.kind === GoodAdminChallenge.kind) {
        return response.data
      }
      throw new ApiError(response.message)
    },
  })

export const leaderboardQueryOptions = (params: {
  limit: number
  offset: number
  division: string
}) =>
  queryOptions({
    queryKey: ['leaderboard', params] as const,
    queryFn: async () => {
      const response = await apiRequest(GetLeaderboardRouteV2, params)
      if (response.kind === GoodLeaderboardV2.kind) {
        return response.data
      }
      throw new ApiError(response.message)
    },
    refetchOnWindowFocus: true,
  })

export const leaderboardGraphQueryOptions = (params: {
  limit: number
  offset: number
  division: string
}) =>
  queryOptions({
    queryKey: ['leaderboard', 'graph', params] as const,
    queryFn: async () => {
      const response = await apiRequest(GetLeaderboardGraphRoute, params)
      if (response.kind === GoodLeaderboardGraph.kind) {
        return response.data.graph
      }
      throw new ApiError(response.message)
    },
    refetchOnWindowFocus: true,
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
      throw new ApiError(response.message)
    },
  })

export const membersQueryOptions = queryOptions({
  queryKey: ['members'] as const,
  queryFn: async () => {
    const response = await apiRequest(GetMembersRoute)
    if (response.kind === GoodMemberData.kind) {
      return response.data
    }
    throw new ApiError(response.message)
  },
})

export const queryKeys = {
  clientConfig: clientConfigQueryOptions.queryKey,
  userSelf: userSelfQueryOptions.queryKey,
  userById: (id: string) => userByIdQueryOptions(id).queryKey,
  challenges: challengesQueryOptions.queryKey,
  adminChallenges: adminChallengesQueryOptions.queryKey,
  adminChallenge: (id: string) => adminChallengeQueryOptions(id).queryKey,
  leaderboard: (params: { limit: number; offset: number; division: string }) =>
    leaderboardQueryOptions(params).queryKey,
  leaderboardGraph: (params: { limit: number; offset: number; division: string }) =>
    leaderboardGraphQueryOptions(params).queryKey,
  challengeSolves: (id: string, params: { limit: number; offset: number }) =>
    challengeSolvesQueryOptions(id, params).queryKey,
  members: membersQueryOptions.queryKey,
}

export function createApiMutation<TRoute extends AnyRouteDefinition>(
  route: TRoute
) {
  return createMutation<RouteResponse<TRoute>, Error, InlineArgs<TRoute>>({
    mutationFn: (args: InlineArgs<TRoute>) => apiRequest(route, args),
  })
}

export function useClientConfig() {
  return createQuery(clientConfigQueryOptions)
}

export function useCurrentUser() {
  return createQuery(userSelfQueryOptions)
}

export function useUserProfile(id: string) {
  return createQuery(userByIdQueryOptions(id))
}

export function useChallenges() {
  return createQuery(challengesQueryOptions)
}

export function useAdminChallenges() {
  return createQuery(adminChallengesQueryOptions)
}

export function useAdminChallenge(id: string, enabled = true) {
  return createQuery({
    ...adminChallengeQueryOptions(id),
    enabled: enabled && browser,
  })
}

export function useLeaderboard(params: {
  limit: number
  offset: number
  division: string
}) {
  return createQuery(leaderboardQueryOptions(params))
}

export function useLeaderboardGraph(params: {
  limit: number
  offset: number
  division: string
}) {
  return createQuery(leaderboardGraphQueryOptions(params))
}

export function useChallengeSolves(
  challengeId: string,
  params: { limit: number; offset: number }
) {
  return createQuery(challengeSolvesQueryOptions(challengeId, params))
}

export function useMembers() {
  return createQuery(membersQueryOptions)
}

export function useLoginMutation() {
  return createApiMutation(LoginRoute)
}

export function useRegisterMutation() {
  return createApiMutation(RegisterRoute)
}

export function useVerifyMutation() {
  return createApiMutation(VerifyRoute)
}

export function useRecoverMutation() {
  return createApiMutation(RecoverRoute)
}

export function useSubmitFlagMutation() {
  return createApiMutation(SubmitFlagRoute)
}

export function useUpdateUserMutation() {
  return createApiMutation(UpdateUserRouteV2)
}

export function useSetEmailMutation() {
  return createApiMutation(SetEmailRoute)
}

export function useDeleteEmailMutation() {
  return createApiMutation(DeleteEmailRoute)
}

export function useCreateMemberMutation() {
  return createApiMutation(CreateMemberRoute)
}

export function useDeleteMemberMutation() {
  return createApiMutation(DeleteMemberRoute)
}

export function useUpdateChallengeMutation() {
  return createApiMutation(UpdateChallengeRoute)
}

export function useDeleteChallengeMutation() {
  return createApiMutation(DeleteChallengeRoute)
}

export function useUploadFilesMutation() {
  return createApiMutation(UploadFilesRoute)
}

export function useCtftimeCallbackMutation() {
  return createApiMutation(CtftimeCallbackRoute)
}
