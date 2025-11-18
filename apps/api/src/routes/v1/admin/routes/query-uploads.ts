import { QueryUploadsRoute } from '@rctf/types'
import { uploadProvider } from '../../../../providers'
import adminGroup from '../group'

adminGroup.route(QueryUploadsRoute, async ({ body, res }) => {
  return res.goodUploadsQuery(
    await Promise.all(
      body.uploads.map(async ({ sha256, name }) => {
        const url = await uploadProvider.getUrl(sha256, name)
        return {
          sha256,
          name,
          url,
        }
      })
    )
  )
})
