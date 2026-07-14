import { AuthorizeExternalAuthRouteV2 } from '@rctf/types'
import {
  getExternalAuthClientPublic,
  issueExternalAuthCode,
} from '../../../../services/external-auth'
import { rateLimitExternalAuthAuthorize } from '../../../../services/rate-limit'
import externalAuthGroup from '../group'

externalAuthGroup.route(
  AuthorizeExternalAuthRouteV2,
  async ({ ctx, res, body, user }) => {
    const client = await getExternalAuthClientPublic(ctx.var.db, body.clientId)
    if (!client || client.redirectUri !== body.redirectUri) {
      return res.badExternalAuthRequest()
    }

    const timeLeft = await rateLimitExternalAuthAuthorize(
      ctx.var.redis,
      user.id
    )
    if (timeLeft !== undefined) {
      return res.badRateLimit({ timeLeft })
    }

    const code = await issueExternalAuthCode(ctx.var.redis, {
      userId: user.id,
      clientId: client.id,
    })

    const redirectTo = new URL(client.redirectUri)
    redirectTo.searchParams.set('code', code)
    if (body.state !== undefined) {
      redirectTo.searchParams.set('state', body.state)
    }
    return res.goodExternalAuthAuthorize({ redirectTo: redirectTo.toString() })
  }
)
