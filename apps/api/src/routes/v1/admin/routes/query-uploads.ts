import { QueryUploadsRoute } from '@rctf/types'
import adminGroup from '../group'

adminGroup.route(QueryUploadsRoute, async ({ res }) => {
  return res.goodUploadsQuery([
    {
      sha256: 'deadbeef',
      name: 'challenge.txt',
      url: 'https://google.com/',
    },
  ])
})
