import { setApiFetch, setAuthChangeHandler } from '$lib/api'
import { clientConfigQueryOptions } from '$lib/query/config'
import { createQueryClient, resetSessionQueries } from '$lib/query/core'
import { userSelfQueryOptions } from '$lib/query/user'
import type { LayoutLoad } from './$types'

export const ssr = false
export const prerender = false
export const csr = true

const queryClient = createQueryClient()
setAuthChangeHandler(() => void resetSessionQueries(queryClient))

export const load: LayoutLoad = async ({ fetch }) => {
  setApiFetch(fetch)
  const clientConfig = await queryClient.fetchQuery(clientConfigQueryOptions)
  await queryClient.prefetchQuery(userSelfQueryOptions)

  return { queryClient, clientConfig }
}
