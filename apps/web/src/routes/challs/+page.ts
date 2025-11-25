import { GetChallengesRoute, GoodChallenges } from '@rctf/types'
import { apiRequest, isAuthenticated } from '$lib'
import type { PageLoad } from './$types'

export const ssr = false

export const load: PageLoad = async () => {
  if (!isAuthenticated()) {
    return { challenges: null }
  }

  const response = await apiRequest(GetChallengesRoute)

  if (response.kind !== GoodChallenges.kind) {
    return { challenges: null, error: response.message }
  }

  return {
    challenges: response.data,
  }
}
