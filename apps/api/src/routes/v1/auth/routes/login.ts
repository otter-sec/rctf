import { LoginRoute } from '@rctf/types'
import authGroup from '../group'

authGroup.route(LoginRoute, async ({ res }) => {
  return res.goodLogin({ authToken: 'dummy-auth-token' })
})
