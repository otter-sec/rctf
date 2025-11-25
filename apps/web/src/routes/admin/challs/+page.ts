import { GetAdminChallengesRoute, GoodAdminChallenges } from '@rctf/types'
import { apiRequest, type AdminChallenge } from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async () => {
  const response = await apiRequest(GetAdminChallengesRoute)

  if (response.kind === GoodAdminChallenges.kind) {
    return {
      challenges: response.data as AdminChallenge[],
      error: null,
    }
  }

  return {
    challenges: [] as AdminChallenge[],
    error: response.message,
  }
}
