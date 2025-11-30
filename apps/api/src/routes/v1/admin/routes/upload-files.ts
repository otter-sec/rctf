import { UploadFilesRoute } from '@rctf/types'
import { dataUriToBuffer } from 'data-uri-to-buffer'
import { uploadProvider } from '../../../../providers'
import adminGroup from '../group'

// TODO(es3n1n): We definitely need to have a v2 method to upload files without URIs.
adminGroup.route(UploadFilesRoute, async ({ res, body }) => {
  let convertedFiles
  try {
    convertedFiles = body.files.map(({ name, data }) => {
      return {
        name,
        data: Buffer.from(dataUriToBuffer(data).buffer),
      }
    })
  } catch (e) {
    return res.badDataUri()
  }

  const files = await Promise.all(
    convertedFiles.map(async ({ name, data }) => {
      const url = await uploadProvider.uploadAttachment(data, name)
      return { name, url }
    })
  )

  return res.goodFilesUpload(files)
})
