import { apiGet } from '$lib/server/api'
import type { LeaderboardData } from '$lib/types'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => ({
  leaderboard: await apiGet<LeaderboardData>('/v1/leaderboard/now', {
    limit: 100,
    offset: 0,
    division: 'open',
  }),
})
