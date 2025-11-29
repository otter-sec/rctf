import { config } from '@rctf/config'
import { DeleteCtftimeRoute } from '@rctf/types'
import { deleteCtftimeId } from '../../../../services/users'
import usersGroup from '../group'

usersGroup.route(DeleteCtftimeRoute, async ({ res, ctx, user }) => {
  if (!config.ctftime) {
    return res.badEndpoint()
  }
  return await deleteCtftimeId(res, ctx.var.db, ctx.var.redis, user.id)
})
