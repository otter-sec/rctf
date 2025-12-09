import { leaderboardWithGraphQueryOptions } from '$lib/query'
import type { PageLoad } from './$types'
import { PAGE_SIZE } from './constants'

export const ssr = false

export const load: PageLoad = async ({ parent }) => {
  const { queryClient } = await parent()

  await queryClient.prefetchQuery(
    leaderboardWithGraphQueryOptions({ limit: PAGE_SIZE, offset: 0 })
  )
}
