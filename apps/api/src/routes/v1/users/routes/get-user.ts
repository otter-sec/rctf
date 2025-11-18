import { GetUserRoute } from '@rctf/types'
import { getFullUserFromId } from '../../../../services/full-user'
import usersGroup from '../group'

usersGroup.route(GetUserRoute, async ({ ctx, res, params: { id } }) => {
  const fullUser = await getFullUserFromId(ctx.var.db, ctx.var.redis, id)
  if (!fullUser) {
    return res.badUnknownUser()
  }
  return res.goodUserData(fullUser)
})
