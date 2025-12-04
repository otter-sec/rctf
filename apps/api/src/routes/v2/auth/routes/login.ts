import type { User } from '@rctf/db'
import { LoginRouteV2 } from '@rctf/types'
import { createToken, parseToken, TokenKind } from '../../../../lib/tokens'
import { getUser, getUserByCtftimeId, getUserByDiscordId } from '../../../../services/users'
import authGroup from '../group'

authGroup.route(LoginRouteV2, async ({ ctx, res, body }) => {
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
  } else if (body.discordToken) {
    // Login with Discord:
    const discordToken = await parseToken(
      TokenKind.DiscordAuth,
      body.discordToken ?? ''
    )
    if (!discordToken) {
      return res.badDiscordToken()
    }
    user = await getUserByDiscordId(ctx.var.db, discordToken.discordId)
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
