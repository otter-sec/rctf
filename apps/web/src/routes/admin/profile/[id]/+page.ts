import { userByIdQueryOptions } from '$lib/query'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params, parent }) => {
  const { queryClient } = await parent()
  await queryClient.prefetchQuery(userByIdQueryOptions(params.id))
}
