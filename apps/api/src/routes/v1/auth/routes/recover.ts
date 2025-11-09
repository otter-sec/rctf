import { RecoverRoute } from '@rctf/types'
import authGroup from '../group'

authGroup.route(RecoverRoute, async ({ res }) => {
  return res.goodVerifySent()
})
