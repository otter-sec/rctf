import { config } from '@rctf/config'
import { DeleteEmailRoute } from '@rctf/types'
import { deleteEmail } from '../../../../services/users'
import usersGroup from '../group'

usersGroup.route(DeleteEmailRoute, async ({ ctx, res, user }) => {
  if (!config.email) {
    return res.badEndpoint()
  }
  if (!user.email) {
    return res.badEmailNoExists()
  }
  return await deleteEmail(res, ctx.var.db, user.id)
})
