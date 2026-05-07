import {
  CompleteAdminUserVerificationRouteV2,
  DeleteAdminUserRouteV2,
  GetAdminBotStatusRouteV2,
  GetAdminChallengeRouteV2,
  GetAdminChallengesRouteV2,
  GetAdminSettingsRouteV2,
  GetAdminUserRouteV2,
  GetAdminUsersRouteV2,
  GetAdminUserVerificationsRouteV2,
  GetInstancerSchemaRouteV2,
  GoodAdminBotStatus,
  GoodAdminChallengesV2,
  GoodAdminChallengeV2,
  GoodAdminSettings,
  GoodAdminUsersV2,
  GoodAdminUserV2,
  GoodAdminUserVerificationsV2,
  GoodInstancerSchema,
  ResendAdminUserVerificationRouteV2,
  UpdateAdminSettingsRouteV2,
  UpdateAdminUserRouteV2,
  UpdateChallengeRouteV2,
  UploadFilesRouteV2,
  type AdminTeamSortBy,
  type AdminTeamSortOrder,
} from '@rctf/types'
import {
  createInfiniteQuery,
  createQuery,
  queryOptions,
} from '@tanstack/svelte-query'
import { browser } from '$app/environment'
import { apiRequest } from '$lib/api'
import { ApiError, createApiMutation } from './core'

const ADMIN_PAGE_SIZE = 100

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

export const adminUserVerificationsQueryKey = [
  'admin',
  'user-verifications',
] as const

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
  params: () => {
    search?: string
    sortBy?: AdminTeamSortBy
    sortOrder?: AdminTeamSortOrder
    statuses?: string
    excludeStatuses?: string
    divisions?: string
    excludeDivisions?: string
  } = () => ({}),
  enabled: () => boolean = () => true
) {
  return createInfiniteQuery(() => {
    const ps = pageSize()
    const query = params()
    return {
      queryKey: ['admin', 'users', 'infinite', ps, query] as const,
      queryFn: async ({ pageParam = 0 }) => {
        const response = await apiRequest(GetAdminUsersRouteV2, {
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
      getNextPageParam: lastPage => {
        const nextOffset = lastPage.offset + lastPage.users.length
        return nextOffset < lastPage.total ? nextOffset : undefined
      },
      enabled: enabled() && browser,
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

export function useInfiniteAdminUserVerifications(
  pageSize: () => number = () => ADMIN_PAGE_SIZE,
  enabled: () => boolean = () => true
) {
  return createInfiniteQuery(() => {
    const ps = pageSize()
    return {
      queryKey: [...adminUserVerificationsQueryKey, 'infinite', ps] as const,
      queryFn: async ({ pageParam = 0 }) => {
        const response = await apiRequest(GetAdminUserVerificationsRouteV2, {
          limit: ps,
          offset: pageParam,
        })
        if (response.kind === GoodAdminUserVerificationsV2.kind) {
          return { ...response.data, offset: pageParam }
        }
        throw new ApiError(response.kind, response.message)
      },
      initialPageParam: 0,
      getNextPageParam: lastPage => {
        const nextOffset = lastPage.offset + lastPage.verifications.length
        return nextOffset < lastPage.total ? nextOffset : undefined
      },
      enabled: enabled() && browser,
    }
  })
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
