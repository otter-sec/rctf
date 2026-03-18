import { GetUserRouteV2 } from '@rctf/types'
import { getFullUserFromId } from '../../../../services/full-user'
import usersGroup from '../group'

usersGroup.route(GetUserRouteV2, async ({ ctx, res, params: { id } }) => {
  const fullUser = await getFullUserFromId(ctx.var.db, id)
  if (!fullUser) {
    return res.badUnknownUser()
  }
  return res.goodUserData({
    ...fullUser,
    avatarUrl: fullUser.avatarUrl ?? null,
    countryCode: fullUser.countryCode ?? null,
    statusText: fullUser.statusText ?? null,
  })
})
