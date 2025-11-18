import { config } from '@rctf/config'
import { GetMembersRoute } from '@rctf/types'
import { getMembers } from '../../../../services/members'
import usersGroup from '../group'

usersGroup.route(GetMembersRoute, async ({ ctx, res, user }) => {
  if (!config.userMembers) {
    return res.badEndpoint()
  }

  return res.goodMemberData(await getMembers(ctx.var.db, user.id))
})
