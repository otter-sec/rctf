import { config } from '@rctf/config'
import { DeleteMemberRoute } from '@rctf/types'
import { deleteMember } from '../../../../services/members'
import usersGroup from '../group'

usersGroup.route(
  DeleteMemberRoute,
  async ({ ctx, res, params: { id }, user }) => {
    if (!config.userMembers) {
      return res.badEndpoint()
    }

    await deleteMember(ctx.var.db, id, user.id)
    return res.goodMemberDelete()
  }
)
