import { RegisterRouteV2 } from '@rctf/types'
import { registerUserV2 } from '../../../../services/auth'
import authGroup from '../group'

authGroup.route(RegisterRouteV2, async ({ res, body, ctx }) => {
  return await registerUserV2(res, ctx.var.db, ctx.var.redis, body)
})
