import { clientConfigQueryOptions } from '$lib/query/config'
import { createQueryClient } from '$lib/query/core'
import { userSelfQueryOptions } from '$lib/query/user'
import type { LayoutLoad } from './$types'

export const ssr = false
export const prerender = false
export const csr = true

// Module scope so load re-runs (invalidateAll) reuse the one client every
// mounted query reads; safe because ssr = false means browser-only evaluation
const queryClient = createQueryClient()

export const load: LayoutLoad = async () => {
  const clientConfig = await queryClient.fetchQuery(clientConfigQueryOptions)
  await queryClient.prefetchQuery(userSelfQueryOptions)

  return { queryClient, clientConfig }
}
