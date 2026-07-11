import { GetVerifyInfoRouteV2, GoodVerifyInfo } from '@rctf/types'
import { createQuery, queryOptions } from '@tanstack/svelte-query'
import { apiRequest } from '$lib/api'
import { unwrapData } from '$lib/query/core'
import { queryKeys } from '$lib/query/keys'

export function verifyInfoQueryOptions(token: string | null) {
  return queryOptions({
    queryKey: queryKeys.verifyInfo(token ?? ''),
    queryFn: async () => {
      const response = await apiRequest(GetVerifyInfoRouteV2, {
        token: token ?? '',
      })
      return unwrapData(response, GoodVerifyInfo)
    },
    enabled: token !== null,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export function useVerifyInfo(token: () => string | null) {
  return createQuery(() => verifyInfoQueryOptions(token()))
}
