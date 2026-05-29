import type { QueryClient } from '@tanstack/svelte-query'
import { queryKeys } from '$lib/query'

export interface InvalidateAdminTeamOptions {
  teamId?: string
  affectsListing?: boolean
  affectsScoring?: boolean
}

export function invalidateAdminTeamQueries(
  qc: QueryClient,
  options: InvalidateAdminTeamOptions = {}
) {
  if (options.teamId) {
    qc.invalidateQueries({ queryKey: queryKeys.adminUser(options.teamId) })
    qc.invalidateQueries({ queryKey: queryKeys.userById(options.teamId) })
  }
  if (options.affectsListing || options.affectsScoring) {
    qc.invalidateQueries({ queryKey: ['admin', 'users'] })
    qc.invalidateQueries({ queryKey: queryKeys.fullLeaderboard })
  }
  if (options.affectsScoring) {
    qc.invalidateQueries({ queryKey: queryKeys.leaderboardChallenges })
  }
}
