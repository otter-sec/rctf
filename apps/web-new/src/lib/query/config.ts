import { GetClientConfigRouteV2, GoodClientConfigV2 } from '@rctf/types'
import { createQuery, queryOptions } from '@tanstack/svelte-query'
import { apiRequest, setClientConfig } from '$lib/api'
import { unwrapData } from '$lib/query/core'
import { queryKeys } from '$lib/query/keys'

export const clientConfigQueryOptions = queryOptions({
  queryKey: queryKeys.clientConfig,
  queryFn: async () => {
    const response = await apiRequest(GetClientConfigRouteV2)
    const data = unwrapData(response, GoodClientConfigV2)
    setClientConfig(data)
    return data
  },
  staleTime: Infinity,
  gcTime: Infinity,
})

export function useClientConfig() {
  return createQuery(() => clientConfigQueryOptions)
}
