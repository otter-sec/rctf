import { VerifyRoute } from '@rctf/types'
import { parseToken, TokenKind } from '../../../../lib/tokens'
import { checkLoginVerification } from '../../../../services/auth-cache'
import { createUser } from '../../../../services/users'
import authGroup from '../group'

authGroup.route(VerifyRoute, async ({ ctx, body, res }) => {
  const tokenData = await parseToken(TokenKind.Verify, body.verifyToken)
  if (!tokenData) {
    return res.badTokenVerification()
  }

  const tokenUnused = await checkLoginVerification(
    ctx.var.redis,
    tokenData.verifyId
  )
  if (!tokenUnused) {
    return res.badTokenVerification()
  }

  if (tokenData.kind !== 'register') {
    throw new Error(`Unsupported kind: ${tokenData.kind}`)
  }

  return await createUser(res, ctx.var.db, {
    division: tokenData.division,
    email: tokenData.email,
    name: tokenData.name,
    ctftimeId: null,
  })
})
