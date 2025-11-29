import { VerifyRoute } from '@rctf/types'
import { checkLoginVerification } from '../../../../cache/auth-cache'
import { createToken, parseToken, TokenKind } from '../../../../lib/tokens'
import {
  createUser,
  getUserByEmail,
  updateUserEmail,
} from '../../../../services/users'
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

  if (tokenData.kind === 'register') {
    return await createUser(res, ctx.var.db, {
      division: tokenData.division,
      email: tokenData.email,
      name: tokenData.name,
      ctftimeId: null,
    })
  }

  if (tokenData.kind === 'recover') {
    const user = await getUserByEmail(ctx.var.db, tokenData.email)
    if (!user) {
      return res.badUnknownUser()
    }

    const authToken = await createToken(TokenKind.Auth, user.id)
    return res.goodVerify({ authToken })
  }

  if (tokenData.kind === 'update') {
    return await updateUserEmail(
      res,
      ctx.var.db,
      ctx.var.redis,
      tokenData.userId,
      {
        email: tokenData.email,
      }
    )
  }

  throw new Error(`Unsupported kind: ${tokenData}`)
})
