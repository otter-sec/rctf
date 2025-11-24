import { apiGet } from '$lib/server/api'
import type { ClientConfig, UserProfile } from '$lib/types'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async () => {
  const [clientConfig, user] = await Promise.all([
    apiGet<ClientConfig>('/v1/integrations/client/config'),
    apiGet<UserProfile>('/v1/users/me'),
  ])
  return { clientConfig, user }
}
