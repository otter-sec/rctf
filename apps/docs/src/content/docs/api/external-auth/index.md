---
title: "External auth"
description: "Public routes that let an external service sign users in with their rCTF account."
order: 16
scroll: true
aside: true
---

:::aside

| Route | Endpoint |
| --- | --- |
| [Get client metadata](/api/external-auth/get-client/) | `<route>GET /api/v2/external-auth/clients/:id</route>` |
| [Authorize](/api/external-auth/authorize/) | `<route>POST /api/v2/external-auth/authorize</route>` |
| [Exchange code for token](/api/external-auth/token/) | `<route>POST /api/v2/external-auth/token</route>` |

:::

These routes implement "Sign in with rCTF" for external services. Users approve access at `/external-auth/authorize`, and the external service exchanges the resulting code through the APIs documented here.

See [Admin](/api/admin/) for the routes that register and revoke clients. [External apps](/admin/external-auth/) walks operators through the complete setup.

:::warning[Not OAuth2]

The flow uses familiar OAuth2 field names, including `client_id`, `redirect_uri`, `code`, and
  `state`, but it does not implement OAuth2. It has no scopes, refresh tokens, PKCE, OIDC
  discovery, token introspection, or revocation. `/token` returns an ordinary rCTF login token
  with full access to the user's account.

:::

### Flow

1. The external service sends the user to `/external-auth/authorize?client_id=...&redirect_uri=...&state=...`.
2. The consent page calls `<route>GET /api/v2/external-auth/clients/:id</route>` to render the client name and verify the redirect URI.
3. The user logs into rCTF if needed, then approves. The page calls `<route>POST /api/v2/external-auth/authorize</route>` with the user's session token and receives a `<red>redirectTo</red>` URL.
4. The browser navigates to `<red>redirect_uri</red>?code=...&state=...`.
5. The external service's backend exchanges the code through `<route>POST /api/v2/external-auth/token</route>` and receives `{accessToken, tokenType: "bearer"}{:ts}`.
6. The service uses the access token in `Authorization: Bearer ...` against any rCTF endpoint - typically `<route>GET /api/v2/users/me</route>` to identify the team.

### Failure model

An unknown client, wrong secret, mismatched redirect URI, or invalid code all return `<response>400 badExternalAuthRequest</response>`. The response does not reveal which check failed. `<route>POST /api/v2/external-auth/authorize</route>` also returns `<response>401 badToken</response>` when the user's session token is missing or invalid, and `<response>403 badPerms</response>` when the team is banned.

### Code lifetime

Authorization codes expire after 60 seconds and can only be used once. Deleting a client prevents future code exchanges but does not revoke access tokens already issued to that client.
