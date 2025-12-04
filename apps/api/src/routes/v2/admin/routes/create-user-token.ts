import { CreateUserTokenRouteV2 } from '@rctf/types'
import { createToken, TokenKind } from '../../../../lib/tokens'
import { getUser } from '../../../../services/users.ts'
import adminGroup from '../group'

adminGroup.route(CreateUserTokenRouteV2, async ({ res, ctx, params }) => {
  const user = await getUser(ctx.var.db, params.id)
  if (!user) {
    return res.badUnknownUser()
  }

  if (user.perms > 0) {
    return res.badUserPrivileged()
  }

  return res.goodCreateUserToken({
    token: await createToken(TokenKind.Team, user.id),
  })
})
