import { BadToken, GetChallengesRoute, GoodChallenges } from '@rctf/types'
import { apiRequest } from '$lib'
import type { PageLoad } from './$types'

export const ssr = false
export const load: PageLoad = async () => {
  const response = await apiRequest(GetChallengesRoute)

  if (response.kind === GoodChallenges.kind) {
    return { challenges: response.data }
  }

  // TODO(es3n1n): change the BadToken message (its a breaking change)
  if (response.kind === BadToken.kind) {
    return {
      challenges: null,
      error: 'You need to be authorized to view challenges.',
    }
  }

  return { challenges: null, error: response.message }
}
