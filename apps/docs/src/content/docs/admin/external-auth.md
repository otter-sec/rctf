---
title: External apps
description: Let external services sign users in with their rCTF account.
order: 7
---

Scoring backends, instancers, dashboards, and other external apps can let users sign in with their rCTF account. After the user approves the app on rCTF, they are sent back with an authorization code.

:::warning[This is *NOT* OAuth2]
This flow borrows OAuth2 field names such as `client_id`, `redirect_uri`, `code`, and `state`, but it is not an OAuth2 implementation. It has no scopes, refresh tokens, PKCE, OIDC discovery, token introspection, or revocation. The access token is an ordinary rCTF login token with full access to the user's account.
:::

## Registering an app (admin)

Admin-only. Open `/admin/settings`, find the External apps section, click "Add", and provide:

| Field | Purpose |
| --- | --- |
| `<red>name</red>` | Display name shown on the consent page. |
| `<red>redirect_uri</red>` | URI that receives the authorization code. It must match the registered value byte for byte. rCTF does not expand wildcards or normalize the URI. |

rCTF generates a UUID for `<green>client_id</green>` and 32 random bytes, encoded with base64url, for `<green>client_secret</green>`. **The secret is shown exactly once.** If it is lost, delete the app and register it again.

Deleting an app prevents it from exchanging any more authorization codes. Access tokens already issued to the app remain valid.

## Flow

1. External app sends the user to `/external-auth/authorize?client_id=...&redirect_uri=...&state=...`
2. rCTF asks the user to log in if they aren't already, then shows a consent screen
3. User clicks authorize and rCTF mints a single-use code and redirects the browser to `<redirect_uri>?code=...&state=...`
4. External app sends a `<route>POST /api/v2/external-auth/token</route>` request
5. External app uses the access token in `Authorization: Bearer <accessToken>` against any rCTF endpoint

The code is valid for 60 seconds and can only be used once. Before issuing it, `/authorize` checks that `redirect_uri` exactly matches the URI registered for the client.

Exchange the code by sending it with the client ID and secret.

## Endpoints

### `<route>GET /api/v2/external-auth/clients/:id</route>`

This public endpoint returns `<green>goodExternalAuthClient</green>` with the app's `<red>{id, name, redirectUri}</red>` for the consent page. An unknown ID returns `<green>badExternalAuthRequest</green>` with HTTP 400.

### `<route>POST /api/v2/external-auth/authorize</route>`

Send `<red>{clientId, redirectUri, state?}</red>` with the user's session token in `Authorization: Bearer`. The response contains `<red>{redirectTo}</red>`, the complete callback URL with `code` and the optional `state`.

### `<route>POST /api/v2/external-auth/token</route>`

This public endpoint exchanges `<red>{clientId, clientSecret, code}</red>` for `<green>goodExternalAuthToken</green>` with `<red>{accessToken, tokenType: "bearer"}</red>`. A mismatch returns `<green>badExternalAuthRequest</green>` with HTTP 400.

:::note[Failure responses don't distinguish causes]
Unknown client, wrong secret, and wrong/expired/reused code all return the same `<green>badExternalAuthRequest</green>` body.
:::

## Reference client (TypeScript)

```ts title="sign-in-with-rctf.ts" showLineNumbers=false
const RCTF_BASE_URL = 'https://ctf.example.com'
const CLIENT_ID = process.env.RCTF_CLIENT_ID!
const CLIENT_SECRET = process.env.RCTF_CLIENT_SECRET!
const REDIRECT_URI = 'https://my-service.example.com/auth/rctf/callback'

// 1. Send the user here
export function buildSignInUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state,
  })
  return `${RCTF_BASE_URL}/external-auth/authorize?${params}`
}

// 2. When the user comes back, exchange the code
export async function exchangeCode(code: string): Promise<{ accessToken: string }> {
  const res = await fetch(`${RCTF_BASE_URL}/api/v2/external-auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      code,
    }),
  })
  const body = (await res.json()) as {
    kind: string
    data: { accessToken: string; tokenType: 'bearer' }
  }
  if (body.kind !== 'goodExternalAuthToken') {
    throw new Error(`rCTF rejected token exchange: ${JSON.stringify(body)}`)
  }
  return { accessToken: body.data.accessToken }
}

// 3. Identify the team
export async function fetchTeam(accessToken: string): Promise<{ id: string; name: string }> {
  const res = await fetch(`${RCTF_BASE_URL}/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const body = (await res.json()) as {
    data: { id: string; name: string }
  }
  return body.data
}
```

The `state` parameter is yours (rCTF passes it through verbatim).
