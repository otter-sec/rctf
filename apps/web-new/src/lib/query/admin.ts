import {
  FilterAdminSubmissionsRouteV2,
  FilterAdminUsersRouteV2,
  GetAdminBotStatusRouteV2,
  GetAdminChallengeRouteV2,
  GetAdminChallengesRouteV2,
  GetAdminSettingsRouteV2,
  GetAdminUserRouteV2,
  GetAdminUserVerificationsRouteV2,
  GetInstancerSchemaRouteV2,
  GoodAdminBotStatus,
  GoodAdminChallengesV2,
  GoodAdminChallengeV2,
  GoodAdminExternalAuthClients,
  GoodAdminSettings,
  GoodAdminSubmissions,
  GoodAdminUsersV2,
  GoodAdminUserV2,
  GoodAdminUserVerificationsV2,
  GoodInstancerSchema,
  ListExternalAuthClientsRouteV2,
} from '@rctf/types'
import {
  createInfiniteQuery,
  createQuery,
  keepPreviousData,
  queryOptions,
  type QueryClient,
} from '@tanstack/svelte-query'
import { apiRequest } from '$lib/api'
import { getNextOffset } from '$lib/query/challenges'
import { unwrapData } from '$lib/query/core'
import {
  queryKeys,
  type AdminSubmissionsQueryParams,
  type AdminUsersQueryParams,
} from '$lib/query/keys'

export function nextPageOffset(
  lastPage: { offset: number; total: number },
  items: readonly unknown[]
): number | undefined {
  return getNextOffset(lastPage.offset, items.length, lastPage.total)
}

export function dataOrNull<R extends { kind: string }, K extends R['kind']>(
  response: R,
  goodKind: K
): (Extract<R, { kind: K }> extends { data: infer D } ? D : never) | null {
  if (response.kind !== goodKind) return null
  return (
    response as unknown as {
      data: Extract<R, { kind: K }> extends { data: infer D } ? D : never
    }
  ).data
}

export const adminChallengesQueryOptions = queryOptions({
  queryKey: queryKeys.adminChallenges,
  queryFn: async () => {
    const response = await apiRequest(GetAdminChallengesRouteV2)
    return unwrapData(response, GoodAdminChallengesV2)
  },
})

export function useAdminChallenges() {
  return createQuery(() => adminChallengesQueryOptions)
}

export function adminChallengeQueryOptions(id: string | null) {
  return queryOptions({
    queryKey: queryKeys.adminChallenge(id ?? ''),
    queryFn: async () => {
      const response = await apiRequest(GetAdminChallengeRouteV2, { id: id! })
      return unwrapData(response, GoodAdminChallengeV2)
    },
    enabled: !!id,
  })
}

export function useAdminChallenge(id: () => string | null) {
  return createQuery(() => adminChallengeQueryOptions(id()))
}

export function adminUserQueryOptions(id: string | null) {
  return queryOptions({
    queryKey: queryKeys.adminUser(id ?? ''),
    queryFn: async () => {
      const response = await apiRequest(GetAdminUserRouteV2, { id: id! })
      return unwrapData(response, GoodAdminUserV2)
    },
    enabled: !!id,
  })
}

export function useAdminUser(id: () => string | null) {
  return createQuery(() => adminUserQueryOptions(id()))
}

export function useAdminUsersInfinite(
  params: () => AdminUsersQueryParams,
  enabled: () => boolean = () => true
) {
  return createInfiniteQuery(() => {
    const query = params()
    return {
      queryKey: queryKeys.adminUsers(query),
      queryFn: async ({ pageParam }) => {
        const response = await apiRequest(FilterAdminUsersRouteV2, {
          ...query,
          offset: pageParam,
        })
        return { ...unwrapData(response, GoodAdminUsersV2), offset: pageParam }
      },
      enabled: enabled(),
      initialPageParam: 0,
      getNextPageParam: lastPage => nextPageOffset(lastPage, lastPage.users),
      placeholderData: keepPreviousData,
    }
  })
}

export function useAdminSubmissionsInfinite(
  params: () => AdminSubmissionsQueryParams,
  enabled: () => boolean = () => true
) {
  return createInfiniteQuery(() => {
    const query = params()
    return {
      queryKey: queryKeys.adminSubmissions(query),
      queryFn: async ({ pageParam }) => {
        const response = await apiRequest(FilterAdminSubmissionsRouteV2, {
          ...query,
          offset: pageParam,
        })
        return {
          ...unwrapData(response, GoodAdminSubmissions),
          offset: pageParam,
        }
      },
      enabled: enabled(),
      initialPageParam: 0,
      getNextPageParam: lastPage =>
        nextPageOffset(lastPage, lastPage.submissions),
      placeholderData: keepPreviousData,
    }
  })
}

export const adminUserVerificationsQueryOptions = queryOptions({
  queryKey: queryKeys.adminUserVerifications,
  queryFn: async () => {
    const response = await apiRequest(GetAdminUserVerificationsRouteV2)
    return unwrapData(response, GoodAdminUserVerificationsV2)
  },
})

export function useAdminUserVerifications(enabled: () => boolean = () => true) {
  return createQuery(() => ({
    ...adminUserVerificationsQueryOptions,
    enabled: enabled(),
  }))
}

export const adminSettingsQueryOptions = queryOptions({
  queryKey: queryKeys.adminSettings,
  queryFn: async () => {
    const response = await apiRequest(GetAdminSettingsRouteV2)
    return unwrapData(response, GoodAdminSettings)
  },
})

export function useAdminSettings() {
  return createQuery(() => adminSettingsQueryOptions)
}

export const adminExternalAuthClientsQueryOptions = queryOptions({
  queryKey: queryKeys.adminExternalAuthClients,
  queryFn: async () => {
    const response = await apiRequest(ListExternalAuthClientsRouteV2)
    return unwrapData(response, GoodAdminExternalAuthClients)
  },
})

export function useAdminExternalAuthClients() {
  return createQuery(() => adminExternalAuthClientsQueryOptions)
}

export const instancerSchemaQueryOptions = queryOptions({
  queryKey: queryKeys.instancerSchema,
  queryFn: async () => {
    const response = await apiRequest(GetInstancerSchemaRouteV2)
    return dataOrNull(response, GoodInstancerSchema.kind)
  },
  staleTime: Infinity,
})

export function useInstancerSchema() {
  return createQuery(() => instancerSchemaQueryOptions)
}

export const adminBotStatusQueryOptions = queryOptions({
  queryKey: queryKeys.adminBotStatus,
  queryFn: async () => {
    const response = await apiRequest(GetAdminBotStatusRouteV2)
    return dataOrNull(response, GoodAdminBotStatus.kind)
  },
  staleTime: Infinity,
})

export function useAdminBotStatus() {
  return createQuery(() => adminBotStatusQueryOptions)
}

export function invalidateAdminTeamQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
  queryClient.invalidateQueries({ queryKey: queryKeys.fullLeaderboard })
  queryClient.invalidateQueries({
    queryKey: queryKeys.adminUserVerifications,
  })
}
