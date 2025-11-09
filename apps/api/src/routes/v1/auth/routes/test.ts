import { TestAuthRoute } from '@rctf/types'
import authGroup from '../group'

authGroup.route(TestAuthRoute, async ({ res }) => {
  // We will not reach this callback if unauthorized
  return res.goodToken()
})
