import { config } from '@rctf/config'
import { DiscordCallbackRouteV2 } from '@rctf/types'
import integrationsGroup from '../group'
import { createToken, TokenKind } from '../../../../lib/tokens.ts'

const tokenEndpoint = 'https://discord.com/api/v10/oauth2/token';
// NOTE(trixter-osec): /oauth2/@me does not expose the email
const userEndpoint = 'https://discord.com/api/v10/users/@me';

interface TokenResponse {
  token_type: 'Bearer'
  access_token: string
  expires_in: number
  refresh_token: string
  scope: string
}

// @see https://discord.com/developers/docs/resources/user#user-object
interface UserResponse {
  id: string
  username: string
  discriminator: string
  global_name?: string
  avatar?: string
  email?: string
}

integrationsGroup.route(DiscordCallbackRouteV2, async ({res, body}) => {
  if (!config.discord) {
    return res.badEndpoint()
  }

  // TODO(trixter-osec): we probably want some kind of ratelimiting?

  const basicAuth = Buffer.from(`${config.discord.clientId}:${config.discord.clientSecret}`).toString('base64')
  let response = await fetch(tokenEndpoint, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: body.discordCode,
      redirect_uri: `${config.origin}/integrations/discord/callback`,
    }),
    headers: {
      authorization: `Basic ${basicAuth}`,
    }
  })

  if (response.status == 401) {
    return res.badDiscordCode()
  }

  if (!response.ok) {
    throw new Error(
      `Failed to get Discord code: ${response.status}: ${await response.text()}`
    )
  }

  const tokenData = (await response.json()) as TokenResponse
  const userData = (await (
    await fetch(userEndpoint, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })
  ).json()) as UserResponse

  const outToken = await createToken(TokenKind.DiscordAuth, {
    name: userData.username,
    discordId: userData.id,
  })
  return res.goodDiscordToken({
    discordToken: outToken,
    discordId: userData.id,
    discordName: userData.username,
  })
})