import { GetClientConfigRoute, GetUserSelfRoute } from '@rctf/types'
import { apiRequest } from '$lib/api'
import type { LayoutLoad } from './$types'

export const ssr = false
export const load: LayoutLoad = async () => {
  const [clientConfig, user] = await Promise.all([
    apiRequest(GetClientConfigRoute),
    apiRequest(GetUserSelfRoute),
  ])
  return { clientConfig: clientConfig.data, user: user.data }
}
