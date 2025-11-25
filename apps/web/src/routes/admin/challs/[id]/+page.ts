import { GetAdminChallengeRoute, GoodAdminChallenge } from '@rctf/types'
import { apiRequest, type AdminChallengeDetail } from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params }) => {
  // "new" is a special case for creating a new challenge
  if (params.id === 'new') {
    return {
      challenge: null,
      isNew: true,
      error: null,
    }
  }

  const response = await apiRequest(GetAdminChallengeRoute, { id: params.id })

  if (response.kind === GoodAdminChallenge.kind) {
    return {
      challenge: response.data as AdminChallengeDetail,
      isNew: false,
      error: null,
    }
  }

  return {
    challenge: null,
    isNew: false,
    error: response.message,
  }
}

