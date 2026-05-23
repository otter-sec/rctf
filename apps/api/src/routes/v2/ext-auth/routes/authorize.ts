import { AuthorizeExtAuthRouteV2 } from '@rctf/types'
import {
  getExtAuthClientPublic,
  issueExtAuthCode,
} from '../../../../services/ext-auth'
import extAuthGroup from '../group'

extAuthGroup.route(
  AuthorizeExtAuthRouteV2,
  async ({ ctx, res, body, user }) => {
    const client = await getExtAuthClientPublic(ctx.var.db, body.clientId)
    if (!client || client.redirectUri !== body.redirectUri) {
      return res.badExtAuthRequest()
    }

    const code = await issueExtAuthCode(ctx.var.redis, {
      userId: user.id,
      clientId: client.id,
    })

    const sep = client.redirectUri.includes('?') ? '&' : '?'
    const stateSuffix = body.state
      ? `&state=${encodeURIComponent(body.state)}`
      : ''
    const redirectTo = `${client.redirectUri}${sep}code=${encodeURIComponent(code)}${stateSuffix}`
    return res.goodExtAuthAuthorize({ redirectTo })
  }
)
