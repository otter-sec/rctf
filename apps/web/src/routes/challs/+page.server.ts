import { apiGet } from '$lib/server/api'
import type { Challenge } from '$lib/types'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => ({
  challenges: await apiGet<Challenge[]>('/v1/challs'),
})
