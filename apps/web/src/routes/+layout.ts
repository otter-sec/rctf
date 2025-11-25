import {
  GetClientConfigRoute,
  GetUserSelfRoute,
  GoodClientConfig,
  GoodUserSelfData,
} from '@rctf/types'
import { apiRequest, isAuthenticated, type UserProfile } from '$lib/api'
import type { LayoutLoad } from './$types'

export const ssr = false

export const load: LayoutLoad = async () => {
  const clientConfigResponse = await apiRequest(GetClientConfigRoute)

  if (clientConfigResponse.kind !== GoodClientConfig.kind) {
    throw new Error('Failed to load client config')
  }

  let user: UserProfile | null = null
  if (isAuthenticated()) {
    const userResponse = await apiRequest(GetUserSelfRoute)
    if (userResponse.kind === GoodUserSelfData.kind) {
      user = userResponse.data
    }
  }

  return {
    clientConfig: clientConfigResponse.data,
    user,
  }
}
