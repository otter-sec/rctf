import { RecoverRoute } from '@rctf/types'
import { recoverUser } from '../../../../services/auth'
import authGroup from '../group'

authGroup.route(RecoverRoute, async ({ ctx, body, res }) => {
  return await recoverUser(
    res,
    ctx.var.db,
    ctx.var.redis,
    body.email,
    ctx.var.ip
  )
})
