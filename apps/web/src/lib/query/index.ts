import {
  BadNotStarted,
  BadToken,
  CreateMemberRoute,
  CreateUserTokenRouteV2,
  CtftimeCallbackRoute,
  DeleteChallengeRoute,
  DeleteChallengeSolveRouteV2,
  DeleteCtftimeRoute,
  DeleteEmailRoute,
  DeleteMemberRoute,
  GetAdminChallengeRouteV2,
  GetAdminBotStatusRouteV2,
  GetAdminChallengesRouteV2,
  GetAdminSettingsRouteV2,
  GetAdminUsersRouteV2,
  GetChallengeSolvesRouteV2,
  GetChallengesRouteV2,
  GetClientConfigRouteV2,
  GetInstancerSchemaRouteV2,
  GetLeaderboardChallengesRouteV2,
  GetLeaderboardGraphRouteV2,
  GetLeaderboardRouteV2,
  GetLeaderboardWithGraphRoute,
  GetMembersRoute,
  GetUserRouteV2,
  GetUserSelfRouteV2,
  GetVerifyInfoRouteV2,
  GoodAdminBotStatus,
  GoodAdminChallengesV2,
  GoodAdminChallengeV2,
  GoodAdminSettings,
  GoodAdminUsersV2,
  GoodChallengeSolvesV2,
  GoodChallengesV2,
  GoodClientConfigV2,
  GoodInstancerSchema,
  GoodLeaderboardChallengesV2,
  GoodLeaderboardGraph,
  GoodLeaderboardV2,
  GoodLeaderboardWithGraph,
  GoodMemberData,
  GoodUserDataV2,
  GoodUserSelfDataV2,
  GoodVerifyInfo,
  LoginRoute,
  RecoverRouteV2,
  RegisterRouteV2,
  SetCtftimeRoute,
  SetEmailRouteV2,
  SubmitFlagRoute,
  UpdateAvatarRoute,
  UpdateAdminSettingsRouteV2,
  UpdateChallengeRouteV2,
  UpdateUserRouteV2,
  UploadFilesRouteV2,
  VerifyRoute,
  type AnyRouteDefinition,
  type RouteResponse,
} from '@rctf/types'
import {
  createInfiniteQuery,
  createMutation,
  createQuery,
  QueryClient,
  queryOptions,
} from '@tanstack/svelte-query'
import { browser } from '$app/environment'
import {
  apiRequest,
  isAuthenticated,
  setClientConfig,
  type InlineArgs,
} from '$lib/api'

export { QueryClientProvider } from '@tanstack/svelte-query'

export class ApiError extends Error {
  constructor(
    public readonly kind: string,
    public override readonly message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }

  static isNotStarted(error: Error | null): boolean {
    return error instanceof ApiError && error.kind === BadNotStarted.kind
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
    const response = await apiRequest(GetClientConfigRouteV2)
    if (response.kind === GoodClientConfigV2.kind) {
      setClientConfig(response.data)
      return response.data
    }
    throw new ApiError(response.kind, response.message)
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
  refetchInterval: 30 * 1000,
})

export const userByIdQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['user', id] as const,
    queryFn: async () => {
      const response = await apiRequest(GetUserRouteV2, { id })
      if (response.kind === GoodUserDataV2.kind) {
        return response.data
      }
      throw new ApiError(response.kind, response.message)
    },
  })

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

export const adminChallengesQueryOptions = queryOptions({
  queryKey: ['admin', 'challenges'] as const,
  queryFn: async () => {
    const response = await apiRequest(GetAdminChallengesRouteV2)
    if (response.kind === GoodAdminChallengesV2.kind) {
      return response.data
    }
    throw new ApiError(response.kind, response.message)
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
      throw new ApiError(response.kind, response.message)
    },
  })

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

export const membersQueryOptions = queryOptions({
  queryKey: ['members'] as const,
  queryFn: async () => {
    const response = await apiRequest(GetMembersRoute)
    if (response.kind === GoodMemberData.kind) {
      return response.data
    }
    throw new ApiError(response.kind, response.message)
  },
})

export const adminBotStatusQueryOptions = queryOptions({
  queryKey: ['admin', 'admin-bot', 'status'] as const,
  queryFn: async () => {
    const response = await apiRequest(GetAdminBotStatusRouteV2)
    if (response.kind === GoodAdminBotStatus.kind) {
      return response.data
    }
    return null
  },
  staleTime: Infinity,
})

export const adminSettingsQueryOptions = queryOptions({
  queryKey: ['admin', 'settings'] as const,
  queryFn: async () => {
    const response = await apiRequest(GetAdminSettingsRouteV2)
    if (response.kind === GoodAdminSettings.kind) {
      return response.data
    }
    throw new ApiError(response.kind, response.message)
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

export const verifyInfoQueryOptions = (token: string | null) =>
  queryOptions({
    queryKey: ['auth', 'verify-info', token] as const,
    queryFn: async () => {
      if (!token) return null
      const response = await apiRequest(GetVerifyInfoRouteV2, { token })
      if (response.kind === GoodVerifyInfo.kind) {
        return response.data
      }
      return null
    },
    enabled: !!token,
    staleTime: Infinity,
  })

export const queryKeys = {
  clientConfig: clientConfigQueryOptions.queryKey,
  userSelf: userSelfQueryOptions.queryKey,
  userById: (id: string) => userByIdQueryOptions(id).queryKey,
  challenges: challengesQueryOptions.queryKey,
  adminChallenges: adminChallengesQueryOptions.queryKey,
  adminChallenge: (id: string) => adminChallengeQueryOptions(id).queryKey,
  fullLeaderboard: ['leaderboard'] as const,
  leaderboard: (params: { limit: number; offset: number; division: string }) =>
    leaderboardQueryOptions(params).queryKey,
  leaderboardChallenges: leaderboardChallengesQueryOptions.queryKey,
  leaderboardGraph: (params: {
    limit: number
    offset: number
    division: string
  }) => leaderboardGraphQueryOptions(params).queryKey,
  leaderboardWithGraph: (params: {
    limit: number
    offset: number
    division: string
  }) => leaderboardWithGraphQueryOptions(params).queryKey,
  selfUserGraph: (globalPlace: number | null) =>
    selfUserGraphQueryOptions(globalPlace).queryKey,
  challengeSolves: (id: string, params: { limit: number; offset: number }) =>
    challengeSolvesQueryOptions(id, params).queryKey,
  members: membersQueryOptions.queryKey,
  instancerSchema: instancerSchemaQueryOptions.queryKey,
  adminBotStatus: adminBotStatusQueryOptions.queryKey,
  adminSettings: adminSettingsQueryOptions.queryKey,
}

export function createApiMutation<TRoute extends AnyRouteDefinition>(
  route: TRoute
) {
  return createMutation(() => ({
    mutationFn: (args: InlineArgs<TRoute>) =>
      apiRequest(route, args) as Promise<RouteResponse<TRoute>>,
  }))
}

export function useClientConfig() {
  return createQuery(() => clientConfigQueryOptions)
}

export function useCurrentUser() {
  return createQuery(() => userSelfQueryOptions)
}

export function useUserProfile(id: () => string) {
  return createQuery(() => userByIdQueryOptions(id()))
}

export function useChallenges() {
  return createQuery(() => challengesQueryOptions)
}

export function useAdminChallenges() {
  return createQuery(() => adminChallengesQueryOptions)
}

export function useAdminChallenge(
  id: () => string,
  enabled: () => boolean = () => true
) {
  return createQuery(() => ({
    ...adminChallengeQueryOptions(id()),
    enabled: enabled() && browser,
  }))
}

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

export function useInfiniteAdminUsers(pageSize: () => number = () => 100) {
  return createInfiniteQuery(() => {
    const ps = pageSize()
    return {
      queryKey: ['admin', 'users', 'infinite', ps] as const,
      queryFn: async ({ pageParam = 0 }) => {
        const response = await apiRequest(GetAdminUsersRouteV2, {
          limit: ps,
          offset: pageParam,
        })
        if (response.kind === GoodAdminUsersV2.kind) {
          return { ...response.data, offset: pageParam }
        }
        throw new ApiError(response.kind, response.message)
      },
      initialPageParam: 0,
      getNextPageParam: lastPage => {
        const nextOffset = lastPage.offset + lastPage.users.length
        return nextOffset < lastPage.total ? nextOffset : undefined
      },
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

export function useMembers() {
  return createQuery(() => membersQueryOptions)
}

export function useAdminBotStatus() {
  return createQuery(() => adminBotStatusQueryOptions)
}

export function useAdminSettings() {
  return createQuery(() => adminSettingsQueryOptions)
}

export function useInstancerSchema() {
  return createQuery(() => instancerSchemaQueryOptions)
}

export function useVerifyInfo(token: () => string | null) {
  return createQuery(() => verifyInfoQueryOptions(token()))
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

export function useSetCtftimeMutation() {
  return createApiMutation(SetCtftimeRoute)
}

export function useDeleteCtftimeMutation() {
  return createApiMutation(DeleteCtftimeRoute)
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

export function useCreateUserTokenMutation() {
  return createApiMutation(CreateUserTokenRouteV2)
}

export function useDeleteChallengeSolveMutation() {
  return createApiMutation(DeleteChallengeSolveRouteV2)
}

export function useUpdateSettingsMutation() {
  return createApiMutation(UpdateAdminSettingsRouteV2)
}
