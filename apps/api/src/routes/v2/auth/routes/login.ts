import { LoginRouteV2 } from '@rctf/types'
import { loginWithPassword } from '../../../../services/auth'
import authGroup from '../group'

authGroup.route(LoginRouteV2, async ({ ctx, res, body }) => {
  return await loginWithPassword(
    res,
    ctx.var.db,
    ctx.var.redis,
    { identifier: body.identifier, password: body.password },
    ctx.var.ip
  )
})
