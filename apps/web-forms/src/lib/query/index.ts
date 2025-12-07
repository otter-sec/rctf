import {
  BadToken,
  CreateMemberRoute,
  CtftimeCallbackRoute,
  DeleteChallengeRoute,
  DeleteEmailRoute,
  DeleteMemberRoute,
  GetAdminChallengeRouteV2,
  GetAdminChallengesRouteV2,
  GetChallengeSolvesRouteV2,
  GetChallengesRouteV2,
  GetClientConfigRouteV2,
  GetInstancerSchemaRouteV2,
  GetLeaderboardGraphRouteV2,
  GetLeaderboardRouteV2,
  GetMembersRoute,
  GetUserRouteV2,
  GetUserSelfRouteV2,
  GoodAdminChallengesV2,
  GoodAdminChallengeV2,
  GoodChallengeSolvesV2,
  GoodChallengesV2,
  GoodClientConfigV2,
  GoodInstancerSchema,
  GoodLeaderboardGraph,
  GoodLeaderboardV2,
  GoodMemberData,
  GoodUserDataV2,
  GoodUserSelfDataV2,
  LoginRoute,
  RecoverRouteV2,
  RegisterRouteV2,
  SetEmailRouteV2,
  SubmitFlagRoute,
  UpdateAvatarRoute,
  UpdateChallengeRouteV2,
  UpdateUserRouteV2,
  UploadFilesRouteV2,
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
          if (error?.name === 'ApiError') return false
          return failureCount < 3
        },
      },
    },
  })
}

export const clientConfigQueryOptions = queryOptions({
  queryKey: ['clientConfig'] as const,
  queryFn: async () => {
    const response = await apiRequest(GetClientConfigRouteV2)
    if (response.kind === GoodClientConfigV2.kind) {
      return response.data
    }
    throw new ApiError(response.message)
  },
  staleTime: Infinity,
})

export const userSelfQueryOptions = queryOptions({
  queryKey: ['user', 'self'] as const,
  queryFn: async () => {
    if (!isAuthenticated()) return null
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
    const response = await apiRequest(GetChallengesRouteV2)
    if (response.kind === GoodChallengesV2.kind) {
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
    const response = await apiRequest(GetAdminChallengesRouteV2)
    if (response.kind === GoodAdminChallengesV2.kind) {
      return response.data
    }
    throw new ApiError(response.message)
  },
})

export const adminChallengeQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['admin', 'challenges', id] as const,
    queryFn: async () => {
      const response = await apiRequest(GetAdminChallengeRouteV2, { id })
      if (response.kind === GoodAdminChallengeV2.kind) {
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
      const response = await apiRequest(GetLeaderboardGraphRouteV2, params)
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

export const instancerSchemaQueryOptions = queryOptions({
  queryKey: ['admin', 'instancer', 'schema'] as const,
  queryFn: async () => {
    const response = await apiRequest(GetInstancerSchemaRouteV2)
    if (response.kind === GoodInstancerSchema.kind) {
      return response.data
    }
    return null
  },
  staleTime: Infinity,
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
  leaderboardGraph: (params: {
    limit: number
    offset: number
    division: string
  }) => leaderboardGraphQueryOptions(params).queryKey,
  challengeSolves: (id: string, params: { limit: number; offset: number }) =>
    challengeSolvesQueryOptions(id, params).queryKey,
  members: membersQueryOptions.queryKey,
  instancerSchema: instancerSchemaQueryOptions.queryKey,
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

export function useInstancerSchema() {
  return createQuery(instancerSchemaQueryOptions)
}

export function useLoginMutation() {
  return createApiMutation(LoginRoute)
}

export function useRegisterMutation() {
  return createApiMutation(RegisterRouteV2)
}

export function useVerifyMutation() {
  return createApiMutation(VerifyRoute)
}

export function useRecoverMutation() {
  return createApiMutation(RecoverRouteV2)
}

export function useSubmitFlagMutation() {
  return createApiMutation(SubmitFlagRoute)
}

export function useUpdateUserMutation() {
  return createApiMutation(UpdateUserRouteV2)
}

export function useSetEmailMutation() {
  return createApiMutation(SetEmailRouteV2)
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
  return createApiMutation(UpdateChallengeRouteV2)
}

export function useDeleteChallengeMutation() {
  return createApiMutation(DeleteChallengeRoute)
}

export function useUploadFilesMutation() {
  return createApiMutation(UploadFilesRouteV2)
}

export function useCtftimeCallbackMutation() {
  return createApiMutation(CtftimeCallbackRoute)
}

export function useUpdateAvatarMutation() {
  return createApiMutation(UpdateAvatarRoute)
}
