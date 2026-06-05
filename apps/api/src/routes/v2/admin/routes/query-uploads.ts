import { QueryUploadsRouteV2 } from '@rctf/types'
import { uploadProvider } from '../../../../providers'
import adminGroup from '../group'

adminGroup.route(QueryUploadsRouteV2, async ({ body, res }) => {
  return res.goodUploadsQueryV2(
    await Promise.all(
      body.uploads.map(async ({ sha256, name }) => {
        const info = await uploadProvider.getAttachmentInfo(sha256, name)
        return {
          sha256,
          name,
          url: info.url,
          size: info.size,
        }
      })
    )
  )
})
