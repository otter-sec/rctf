import type { User } from '@rctf/db'
import { LoginRoute } from '@rctf/types'
import {
  createToken,
  parseToken,
  parseTokenWithMultipleKinds,
  TokenKind,
} from '../../../../lib/tokens'
import { getUserByCtftimeId, redeemTeamToken } from '../../../../services/users'
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
    const parsed = await parseTokenWithMultipleKinds(
      [TokenKind.Team],
      body.teamToken ?? ''
    )
    if (!parsed) {
      return res.badTokenVerification()
    }
    const [, teamId, createdAt] = parsed
    const redeemed = await redeemTeamToken(ctx.var.db, teamId, createdAt)
    if (!redeemed.ok) {
      return redeemed.reason === 'unknown'
        ? res.badUnknownUser()
        : res.badTokenVerification()
    }
    user = redeemed.user
  }

  if (!user) {
    return res.badUnknownUser()
  }

  const authToken = await createToken(TokenKind.Auth, user.id)
  return res.goodLogin({ authToken })
})
