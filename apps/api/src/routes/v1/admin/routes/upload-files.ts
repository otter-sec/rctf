import { UploadFilesRoute } from '@rctf/types'
import adminGroup from '../group'

adminGroup.route(UploadFilesRoute, async ({ res }) => {
  return res.goodFilesUpload([
    {
      name: 'challenge.txt',
      url: 'https://google.com/',
    },
  ])
})
