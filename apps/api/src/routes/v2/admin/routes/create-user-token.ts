import { CreateUserTokenRouteV2 } from '@rctf/types'
import { createToken, TokenKind } from '../../../../lib/tokens'
import { getUser } from '../../../../services/users.ts'
import adminGroup from '../group'

adminGroup.route(CreateUserTokenRouteV2, async ({ res, ctx, params }) => {
  const targetUser = await getUser(ctx.var.db, params.id)
  if (!targetUser) {
    return res.badUnknownUser()
  }

  if (targetUser.perms > 0) {
    return res.badUserPrivileged()
  }

  return res.goodCreateUserTokenV2({
    token: await createToken(TokenKind.Team, targetUser.id),
  })
})
