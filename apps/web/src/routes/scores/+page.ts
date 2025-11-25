import { GetLeaderboardRoute, GoodLeaderboard } from '@rctf/types'
import { apiRequest } from '$lib'
import type { PageLoad } from './$types'

export const ssr = false

export const load: PageLoad = async () => {
  const response = await apiRequest(GetLeaderboardRoute, {
    limit: 100,
    offset: 0,
    division: 'open',
  })

  if (response.kind !== GoodLeaderboard.kind) {
    return { leaderboard: null, error: response.message }
  }

  return {
    leaderboard: response.data,
  }
}
