import {
  GetUserRouteV2,
  GetUserSelfRouteV2,
  GoodUserDataV2,
  GoodUserSelfDataV2,
} from '@rctf/types'
import { createQuery, queryOptions } from '@tanstack/svelte-query'
import { apiRequest, isAuthenticated } from '$lib/api'
import { ApiError } from './core'

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

export function useCurrentUser() {
  return createQuery(() => userSelfQueryOptions)
}

export function useUserProfile(id: () => string) {
  return createQuery(() => userByIdQueryOptions(id()))
}
