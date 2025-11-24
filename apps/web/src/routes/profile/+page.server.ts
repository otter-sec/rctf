import { apiGet } from '$lib/server/api'
import type { UserProfile } from '$lib/types'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => ({
  user: await apiGet<UserProfile>('/v1/users/me'),
})
