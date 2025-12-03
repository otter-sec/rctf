import { CreateUserTokenRouteV2 } from '@rctf/types'
import { createToken, TokenKind } from '../../../../lib/tokens'
import adminGroup from '../group'
import { getFullUserFromId } from '../../../../services/full-user.ts'

adminGroup.route(CreateUserTokenRouteV2, async ({ res, ctx, params }) => {
  const fullUser = await getFullUserFromId(ctx.var.db, ctx.var.redis, params.id)
  if (!fullUser) {
    return res.badUnknownUser()
  }

  // TODO: should we blacklist perms>0 from being able to be reset? otherwise we can privesc

  return res.goodCreateUserToken({
    token: await createToken(TokenKind.Team, fullUser.id),
  })
})
