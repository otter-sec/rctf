import type { User } from '@rctf/db'
import { LoginRoute } from '@rctf/types'
import { createToken, parseToken, TokenKind } from '../../../../lib/tokens'
import { getUser, getUserByCtftimeId } from '../../../../services/users'
import authGroup from '../group'

authGroup.route(LoginRoute, async ({ ctx, res, body }) => {
  let user: User | undefined

  if (body.ctftimeToken) {
    // Login with ctftime:
    const ctfTimeToken = await parseToken(
      TokenKind.CtftimeAuth,
      body.ctftimeToken ?? ''
    )
    if (!ctfTimeToken) {
      return res.badCtftimeToken()
    }
    user = await getUserByCtftimeId(ctx.var.db, ctfTimeToken.ctftimeId)
  } else {
    // Login with team token:
    const userId = await parseToken(TokenKind.Team, body.teamToken ?? '')
    if (!userId) {
      return res.badTokenVerification()
    }
    user = await getUser(ctx.var.db, userId)
  }

  if (!user) {
    return res.badUnknownUser()
  }

  const authToken = await createToken(TokenKind.Auth, user.id)
  return res.goodLogin({ authToken })
})
