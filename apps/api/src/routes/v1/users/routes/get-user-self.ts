import { GetUserSelfRoute } from '@rctf/types'
import { createToken, TokenKind } from '../../../../lib/tokens'
import { getFullUser } from '../../../../services/full-user'
import { allowedDivisions } from '../../../../util/acl'
import usersGroup from '../group'

usersGroup.route(GetUserSelfRoute, async ({ ctx, user, res }) => {
  const [fullUser, teamToken] = await Promise.all([
    getFullUser(ctx.var.db, user),
    createToken(TokenKind.Team, user.id),
  ])
  const allowedDivs = allowedDivisions({
    email: user.email,
    defaultOnly: false,
  }) as string[]

  return res.goodUserSelfData({
    ...fullUser,
    teamToken: teamToken,
    allowedDivisions: allowedDivs,
    perms: user.perms,
  })
})
