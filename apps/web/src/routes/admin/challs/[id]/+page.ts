import { adminChallengeQueryOptions } from '$lib/query'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params, parent }) => {
  if (params.id === 'new') return { challenge: null }

  const { queryClient } = await parent()
  const challenge = await queryClient.fetchQuery(
    adminChallengeQueryOptions(params.id)
  )
  return { challenge }
}
