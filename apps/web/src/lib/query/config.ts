import { GetClientConfigRouteV2, GoodClientConfigV2 } from '@rctf/types'
import { createQuery, queryOptions } from '@tanstack/svelte-query'
import { apiRequest, setClientConfig } from '$lib/api'
import { ApiError } from './core'

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

export function useClientConfig() {
  return createQuery(() => clientConfigQueryOptions)
}
