import {
  leaderboardGraphQueryOptions,
  leaderboardQueryOptions,
} from '$lib/query'
import type { PageLoad } from './$types'

const PAGE_SIZE = 100

export const load: PageLoad = async ({ parent }) => {
  const { queryClient } = await parent()

  const leaderboardParams = { limit: PAGE_SIZE, offset: 0, division: 'open' }
  const graphParams = { limit: 10, division: 'open' }

  await Promise.all([
    queryClient.prefetchQuery(leaderboardQueryOptions(leaderboardParams)),
    queryClient.prefetchQuery(leaderboardGraphQueryOptions(graphParams)),
  ])
}
