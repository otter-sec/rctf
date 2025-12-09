import { GetVerifyInfoRouteV2 } from '@rctf/types'
import { parseToken, TokenKind } from '../../../../lib/tokens'
import authGroup from '../group'
import { getUserByEmail } from '../../../../services/users'

authGroup.route(GetVerifyInfoRouteV2, async ({ ctx, query, res }) => {
  const tokenData = await parseToken(TokenKind.Verify, query.token)
  if (!tokenData) {
    return res.badTokenVerification()
  }

  if (tokenData.kind === 'register') {
    return res.goodVerifyInfo({
      kind: 'register',
      email: tokenData.email,
      name: tokenData.name,
    })
  }

  if (tokenData.kind === 'recover' || tokenData.kind === 'update') {
    const user = await getUserByEmail(ctx.var.db, tokenData.email)
    return res.goodVerifyInfo({
      kind: tokenData.kind,
      email: tokenData.email,
      name: user?.name,
    })
  }

  // should never happen
  return res.badTokenVerification()
})
