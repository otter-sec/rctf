import { RegisterVerifyRouteV2 } from '@rctf/types'
import { verifyRegisterUserV2 } from '../../../../services/auth'
import authGroup from '../group'

authGroup.route(RegisterVerifyRouteV2, async ({ ctx, body, res }) => {
  return await verifyRegisterUserV2(
    res,
    ctx.var.db,
    ctx.var.redis,
    body.verifyToken
  )
})
