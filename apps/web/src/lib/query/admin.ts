import {
  CompleteAdminUserVerificationRouteV2,
  DeleteAdminUserRouteV2,
  FilterAdminUsersRouteV2,
  GetAdminBotStatusRouteV2,
  GetAdminChallengeRouteV2,
  GetAdminChallengesRouteV2,
  GetAdminSettingsRouteV2,
  GetAdminSubmissionLogsRouteV2,
  GetAdminUserRouteV2,
  GetAdminUserVerificationsRouteV2,
  GetInstancerSchemaRouteV2,
  GoodAdminBotStatus,
  GoodAdminChallengesV2,
  GoodAdminChallengeV2,
  GoodAdminSettings,
  GoodAdminSubmissionLogs,
  GoodAdminUsersV2,
  GoodAdminUserV2,
  GoodAdminUserVerificationsV2,
  GoodInstancerSchema,
  ResendAdminUserVerificationRouteV2,
  UpdateAdminSettingsRouteV2,
  UpdateAdminUserRouteV2,
  UpdateChallengeRouteV2,
  UploadFilesRouteV2,
  type RouteBody,
  type RouteQuery,
  type SubmissionLogKind,
  type SubmissionLogResult,
  type SubmissionLogSortBy,
  type SubmissionLogSortOrder,
} from '@rctf/types'
import {
  createInfiniteQuery,
  createQuery,
  keepPreviousData,
  queryOptions,
} from '@tanstack/svelte-query'
import { browser } from '$app/environment'
import { apiRequest } from '$lib/api'
import { ApiError, createApiMutation } from './core'

type AdminUsersRouteQuery = RouteQuery<typeof FilterAdminUsersRouteV2>
type AdminUsersRouteBody = RouteBody<typeof FilterAdminUsersRouteV2>
export type AdminUsersQueryParams = Pick<
  AdminUsersRouteQuery,
  'search' | 'sortBy' | 'sortOrder'
> &
  AdminUsersRouteBody

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

export const adminSubmissionLogsQueryOptions = (params: {
  limit: number
  offset: number
  sortBy?: SubmissionLogSortBy
  sortOrder?: SubmissionLogSortOrder
  challengeId?: string
  challengeIds?: string
  excludeChallengeIds?: string
  challengeSearch?: string
  userId?: string
  userIds?: string
  excludeUserIds?: string
  teamSearch?: string
  kind?: SubmissionLogKind
  kinds?: string
  excludeKinds?: string
  result?: SubmissionLogResult
  results?: string
  excludeResults?: string
}) =>
  queryOptions({
    queryKey: ['admin', 'submission-logs', params] as const,
    queryFn: async () => {
      const response = await apiRequest(GetAdminSubmissionLogsRouteV2, params)
      if (response.kind === GoodAdminSubmissionLogs.kind) {
        return response.data
      }
      throw new ApiError(response.kind, response.message)
    },
  })

export const adminUserQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['admin', 'users', id] as const,
    queryFn: async () => {
      const response = await apiRequest(GetAdminUserRouteV2, { id })
      if (response.kind === GoodAdminUserV2.kind) {
        return response.data
      }
      throw new ApiError(response.kind, response.message)
    },
  })

export const adminUserVerificationsQueryOptions = queryOptions({
  queryKey: ['admin', 'user-verifications'] as const,
  queryFn: async () => {
    const response = await apiRequest(GetAdminUserVerificationsRouteV2)
    if (response.kind === GoodAdminUserVerificationsV2.kind) {
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

export function useInfiniteAdminUsers(
  pageSize: () => number = () => 100,
  params: () => AdminUsersQueryParams = () => ({}),
  enabled: () => boolean = () => true
) {
  return createInfiniteQuery(() => {
    const ps = pageSize()
    const query = params()
    return {
      queryKey: ['admin', 'users', 'infinite', ps, query] as const,
      queryFn: async ({ pageParam = 0 }) => {
        const response = await apiRequest(FilterAdminUsersRouteV2, {
          limit: ps,
          offset: pageParam,
          ...query,
        })
        if (response.kind === GoodAdminUsersV2.kind) {
          return { ...response.data, offset: pageParam }
        }
        throw new ApiError(response.kind, response.message)
      },
      initialPageParam: 0,
      enabled: enabled() && browser,
      getNextPageParam: lastPage => {
        const nextOffset = lastPage.offset + lastPage.users.length
        return nextOffset < lastPage.total ? nextOffset : undefined
      },
      placeholderData: keepPreviousData,
    }
  })
}

export function useAdminUser(id: () => string | null) {
  return createQuery(() => {
    const userId = id()
    return {
      ...adminUserQueryOptions(userId ?? ''),
      enabled: !!userId && browser,
    }
  })
}

export function useAdminUserVerifications(enabled: () => boolean = () => true) {
  return createQuery(() => ({
    ...adminUserVerificationsQueryOptions,
    enabled: enabled() && browser,
  }))
}

export function useAdminBotStatus() {
  return createQuery(() => adminBotStatusQueryOptions)
}

export function useAdminSettings() {
  return createQuery(() => adminSettingsQueryOptions)
}

export function useInfiniteAdminSubmissionLogs(
  params: () => {
    sortBy?: SubmissionLogSortBy
    sortOrder?: SubmissionLogSortOrder
    challengeId?: string
    challengeIds?: string
    excludeChallengeIds?: string
    challengeSearch?: string
    userId?: string
    userIds?: string
    excludeUserIds?: string
    teamSearch?: string
    kind?: SubmissionLogKind
    kinds?: string
    excludeKinds?: string
    result?: SubmissionLogResult
    results?: string
    excludeResults?: string
  },
  pageSize: () => number = () => 100
) {
  return createInfiniteQuery(() => {
    const p = params()
    const ps = pageSize()
    return {
      queryKey: ['admin', 'submission-logs', 'infinite', p, ps] as const,
      queryFn: async ({ pageParam = 0 }) => {
        const response = await apiRequest(GetAdminSubmissionLogsRouteV2, {
          limit: ps,
          offset: pageParam,
          ...p,
        })
        if (response.kind === GoodAdminSubmissionLogs.kind) {
          return { ...response.data, offset: pageParam }
        }
        throw new ApiError(response.kind, response.message)
      },
      initialPageParam: 0,
      getNextPageParam: lastPage => {
        const nextOffset = lastPage.offset + lastPage.logs.length
        return nextOffset < lastPage.total ? nextOffset : undefined
      },
      placeholderData: keepPreviousData,
    }
  })
}

export function useInstancerSchema() {
  return createQuery(() => instancerSchemaQueryOptions)
}

export function useUpdateChallengeMutation() {
  return createApiMutation(UpdateChallengeRouteV2)
}

export function useUploadFilesMutation() {
  return createApiMutation(UploadFilesRouteV2)
}

export function useUpdateSettingsMutation() {
  return createApiMutation(UpdateAdminSettingsRouteV2)
}

export function useUpdateAdminUserMutation() {
  return createApiMutation(UpdateAdminUserRouteV2)
}

export function useDeleteAdminUserMutation() {
  return createApiMutation(DeleteAdminUserRouteV2)
}

export function useCompleteAdminUserVerificationMutation() {
  return createApiMutation(CompleteAdminUserVerificationRouteV2)
}

export function useResendAdminUserVerificationMutation() {
  return createApiMutation(ResendAdminUserVerificationRouteV2)
}
