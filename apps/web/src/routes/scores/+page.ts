import {
  leaderboardGraphQueryOptions,
  leaderboardQueryOptions,
} from '$lib/query'
import { PAGE_SIZE } from './constants'
import type { PageLoad } from './$types'

export const ssr = false

export const load: PageLoad = async ({ parent }) => {
  const { queryClient } = await parent()

  const leaderboardParams = { limit: PAGE_SIZE, offset: 0, division: 'open' }
  const graphParams = { limit: 10, division: 'open', offset: 0 }

  await Promise.all([
    queryClient.prefetchQuery(leaderboardQueryOptions(leaderboardParams)),
    queryClient.prefetchQuery(leaderboardGraphQueryOptions(graphParams)),
  ])
}
