import { VerifyRouteV2 } from '@rctf/types'
import { verifyUserV2 } from '../../../../services/auth'
import authGroup from '../group'

authGroup.route(VerifyRouteV2, async ({ ctx, body, res }) => {
  return await verifyUserV2(res, ctx.var.db, ctx.var.redis, body.verifyToken)
})
