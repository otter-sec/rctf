import { clientConfigQueryOptions } from '$lib/query/config'
import { createQueryClient } from '$lib/query/core'
import { userSelfQueryOptions } from '$lib/query/user'
import type { LayoutLoad } from './$types'

export const ssr = false
export const prerender = false
export const csr = true

const queryClient = createQueryClient()

export const load: LayoutLoad = async () => {
  const clientConfig = await queryClient.fetchQuery(clientConfigQueryOptions)
  await queryClient.prefetchQuery(userSelfQueryOptions)

  return { queryClient, clientConfig }
}
