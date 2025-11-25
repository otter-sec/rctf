import { GetUserRoute, GoodUserData } from '@rctf/types'
import { apiRequest, type PublicUserProfile } from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params }) => {
  const response = await apiRequest(GetUserRoute, { id: params.id })

  if (response.kind === GoodUserData.kind) {
    return {
      user: response.data as PublicUserProfile,
      error: null,
    }
  }

  return {
    user: null,
    error: response.message,
  }
}
