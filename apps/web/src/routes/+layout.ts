import {
  clientConfigQueryOptions,
  createQueryClient,
  userSelfQueryOptions,
} from '$lib/query'
import type { LayoutLoad } from './$types'

export const ssr = false

export const load: LayoutLoad = async () => {
  const queryClient = createQueryClient()

  const clientConfig = await queryClient.fetchQuery(clientConfigQueryOptions)
  await queryClient.prefetchQuery(userSelfQueryOptions)

  return {
    queryClient,
    clientConfig,
  }
}
