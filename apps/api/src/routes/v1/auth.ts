import { RegisterRoute } from '@rctf/types'
import { createRouterGroup } from '../../lib/route-module'

const group = createRouterGroup()
export default group

group.declareRouter(RegisterRoute, async ({ res, body }) => {
  if (!body.email && !body.ctftimeToken) {
    return res.badEmail()
  }

  if (body.ctftimeToken) {
    return res.goodRegister({ authToken: 'example-token' })
  }

  return res.goodVerifySent()
})
