import { challengesQueryOptions } from '$lib/query'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ parent }) => {
  const { queryClient } = await parent()
  await queryClient.prefetchQuery(challengesQueryOptions)
}
