import { AuthorizeExternalAuthRouteV2 } from '@rctf/types'
import {
  getExternalAuthClientPublic,
  issueExternalAuthCode,
} from '../../../../services/external-auth'
import externalAuthGroup from '../group'

externalAuthGroup.route(
  AuthorizeExternalAuthRouteV2,
  async ({ ctx, res, body, user }) => {
    const client = await getExternalAuthClientPublic(ctx.var.db, body.clientId)
    if (!client || client.redirectUri !== body.redirectUri) {
      return res.badExternalAuthRequest()
    }

    const code = await issueExternalAuthCode(ctx.var.redis, {
      userId: user.id,
      clientId: client.id,
    })

    const sep = client.redirectUri.includes('?') ? '&' : '?'
    const stateSuffix = body.state
      ? `&state=${encodeURIComponent(body.state)}`
      : ''
    const redirectTo = `${client.redirectUri}${sep}code=${encodeURIComponent(code)}${stateSuffix}`
    return res.goodExternalAuthAuthorize({ redirectTo })
  }
)
