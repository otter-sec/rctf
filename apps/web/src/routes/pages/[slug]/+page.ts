import { error } from '@sveltejs/kit'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params, parent }) => {
  const { clientConfig } = await parent()
  const customPage = clientConfig.customPages.find(
    page => page.slug === params.slug
  )

  if (!customPage) error(404, 'Page not found')

  return { customPage }
}
