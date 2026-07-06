import {
  GetMembersRoute,
  GetUserRouteV2,
  GetUserSelfRouteV2,
  GoodMemberData,
  GoodUserDataV2,
  GoodUserSelfDataV2,
} from '@rctf/types'
import { createQuery, queryOptions } from '@tanstack/svelte-query'
import { apiRequest, isAuthenticated } from '$lib/api'
import { ApiError } from '$lib/query/core'
import { queryKeys } from '$lib/query/keys'

export const userSelfQueryOptions = queryOptions({
  queryKey: queryKeys.userSelf,
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

export function useCurrentUser() {
  return createQuery(() => userSelfQueryOptions)
}

export function userByIdQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.userById(id),
    queryFn: async () => {
      const response = await apiRequest(GetUserRouteV2, { id })
      if (response.kind === GoodUserDataV2.kind) {
        return response.data
      }
      throw new ApiError(response.kind, response.message)
    },
  })
}

export function useUserById(id: () => string) {
  return createQuery(() => userByIdQueryOptions(id()))
}

export function membersQueryOptions(enabled: boolean) {
  return queryOptions({
    queryKey: queryKeys.members,
    queryFn: async () => {
      const response = await apiRequest(GetMembersRoute)
      if (response.kind === GoodMemberData.kind) {
        return response.data
      }
      throw new ApiError(response.kind, response.message)
    },
    enabled,
  })
}

export function useMembers(enabled: () => boolean) {
  return createQuery(() => membersQueryOptions(enabled()))
}
