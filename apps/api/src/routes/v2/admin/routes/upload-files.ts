import { UploadFilesRouteV2 } from '@rctf/types'
import { uploadProvider } from '../../../../providers'
import adminGroup from '../group'

adminGroup.route(UploadFilesRouteV2, async ({ res, body }) => {
  const files = await Promise.all(
    body.files.map(async file => {
      const data = await file.arrayBuffer()
      const url = await uploadProvider.uploadAttachment(
        Buffer.from(data),
        file.name
      )
      return { name: file.name, url, size: data.byteLength }
    })
  )

  return res.goodFilesUpload(files)
})
