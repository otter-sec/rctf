import { ExtAuthTokenRouteV2 } from '@rctf/types'
import { createToken, TokenKind } from '../../../../lib/tokens'
import {
  consumeExtAuthCode,
  verifyExtAuthClientSecret,
} from '../../../../services/ext-auth'
import extAuthGroup from '../group'

extAuthGroup.route(ExtAuthTokenRouteV2, async ({ ctx, res, body }) => {
  const payload = await consumeExtAuthCode(ctx.var.redis, body.code)
  if (!payload || payload.clientId !== body.clientId) {
    return res.badExtAuthRequest()
  }

  const ok = await verifyExtAuthClientSecret(
    ctx.var.db,
    body.clientId,
    body.clientSecret
  )
  if (!ok) {
    return res.badExtAuthRequest()
  }

  const accessToken = await createToken(TokenKind.Auth, payload.userId)
  return res.goodExtAuthToken({ accessToken, tokenType: 'bearer' })
})
