import { config } from '@rctf/config'
import { CtftimeCallbackRoute } from '@rctf/types'
import { createToken, TokenKind } from '../../../../lib/tokens'
import integrationsGroup from '../group'

const tokenEndpoint = 'https://oauth.ctftime.org/token'
const userEndpoint = 'https://oauth.ctftime.org/user'

interface TokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

interface UserResponse {
  team:
    | {
        id: number
        name: string
        country: string
        logo: string
      }
    | undefined
}

integrationsGroup.route(CtftimeCallbackRoute, async ({ res, body }) => {
  if (!config.ctftime) {
    return res.badEndpoint()
  }

  let response = await fetch(tokenEndpoint, {
    method: 'POST',
    body: new URLSearchParams({
      client_id: config.ctftime.clientId,
      client_secret: config.ctftime.clientSecret,
      code: body.ctftimeCode,
    }),
  })

  if (response.status === 401) {
    return res.badCtftimeCode()
  }

  if (!response.ok) {
    throw new Error(
      `Failed to get ctftime code: ${response.status}: ${await response.text()}`
    )
  }

  const tokenData = (await response.json()) as TokenResponse
  const userData = (await (
    await fetch(userEndpoint, {
      headers: {
        authorization: `Bearer ${tokenData.access_token}`,
      },
    })
  ).json()) as UserResponse

  if (!userData.team) {
    return res.badCtftimeCode()
  }

  const outToken = await createToken(TokenKind.CtftimeAuth, {
    name: userData.team.name,
    ctftimeId: userData.team.id.toString(),
  })
  return res.goodCtftimeToken({
    ctftimeToken: outToken,
    ctftimeName: userData.team.name,
    ctftimeId: userData.team.id,
  })
})
