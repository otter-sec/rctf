import { RegisterRoute } from '@rctf/types'
import { registerUser } from '../../../../services/auth'
import authGroup from '../group'

authGroup.route(RegisterRoute, async ({ res, body, ctx }) => {
  return await registerUser(res, ctx.var.db, ctx.var.redis, body, ctx.var.ip)
})
