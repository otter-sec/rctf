import { RecoverRouteV2 } from '@rctf/types'
import { recoverUser } from '../../../../services/auth'
import authGroup from '../group'

authGroup.route(RecoverRouteV2, async ({ res, body, ctx }) => {
  return await recoverUser(
    res,
    ctx.var.db,
    ctx.var.redis,
    body.email,
    ctx.var.ip
  )
})
