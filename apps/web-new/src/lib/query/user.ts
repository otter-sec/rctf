import { GetUserSelfRouteV2, GoodUserSelfDataV2 } from '@rctf/types'
import { createQuery, queryOptions } from '@tanstack/svelte-query'
import { apiRequest, isAuthenticated } from '$lib/api'
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
