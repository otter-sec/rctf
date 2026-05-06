import { VerifyRoute } from '@rctf/types'
import { verifyUser } from '../../../../services/auth'
import authGroup from '../group'

authGroup.route(VerifyRoute, async ({ ctx, body, res }) => {
  return await verifyUser(res, ctx.var.db, ctx.var.redis, body.verifyToken)
})
