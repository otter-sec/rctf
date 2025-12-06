import { RegisterRouteV2 } from '@rctf/types'
import { registerUser } from '../../../../services/auth'
import authGroup from '../group'

authGroup.route(RegisterRouteV2, async ({ res, body, ctx }) => {
  return await registerUser(res, ctx.var.db, ctx.var.redis, body)
})
