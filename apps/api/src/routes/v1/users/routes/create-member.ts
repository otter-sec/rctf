import { config } from '@rctf/config'
import { CreateMemberRoute } from '@rctf/types'
import { createMember } from '../../../../services/members'
import usersGroup from '../group'

usersGroup.route(CreateMemberRoute, async ({ ctx, res, body, user }) => {
  if (!config.userMembers) {
    return res.badEndpoint()
  }
  return await createMember(
    res,
    ctx.var.db,
    user.id,
    body.email,
    config.maxMembers
  )
})
