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

These routes power the "Sign in with rCTF" flow for external services. Users approve access at `<route>/external-auth/authorize</route>`, while that page and the external service call the APIs documented here.

See [Admin](/api/admin/) for the routes that register and revoke clients. [External apps](/admin/external-auth/) walks operators through the complete setup.

:::warning[Not OAuth2]

The wire-level field names (`client_id`, `redirect_uri`, `code`, `state`) match what integrators
  expect, but the flow is not OAuth2. There are no scopes, refresh tokens, PKCE, `id_token`/OIDC
  discovery, token introspection, or revocation. The access token returned by `/token` is a regular
  rCTF auth token - identical to one minted on login - and grants full account access to the
  signing-in user.

:::

### Flow

1. The external service sends the user to `<route>/external-auth/authorize?client_id=...&redirect_uri=...&state=...</route>`.
2. The consent page calls `<route>GET /api/v2/external-auth/clients/:id</route>` to render the client name and verify the redirect URI.
3. The user logs into rCTF if needed, then approves. The page calls `<route>POST /api/v2/external-auth/authorize</route>` with the user's session token and receives a `<red>redirectTo</red>` URL.
4. The browser navigates to `<red>redirect_uri</red>?code=...&state=...`.
5. The external service's backend exchanges the code through `<route>POST /api/v2/external-auth/token</route>` and receives `{accessToken, tokenType: "bearer"}{:ts}`.
6. The service uses the access token in `Authorization: Bearer ...` against any rCTF endpoint - typically `<route>GET /api/v1/users/me</route>` to identify the team.

### Failure model

Every failure mode (unknown client, wrong secret, mismatched redirect URI, missing/expired/reused code, mismatched client on a code) returns the same `<response>400 badExternalAuthRequest</response>` body. The endpoint deliberately doesn't distinguish causes so callers can't probe it. The only authenticated route in the section is `<route>POST /api/v2/external-auth/authorize</route>`, which additionally returns `<response>401 badToken</response>` when the user session token is missing or invalid.

### Code lifetime

Authorization codes expire from Redis after 60 seconds and can only be used once. The first `<route>POST /api/v2/external-auth/token</route>` call deletes the code atomically, preventing a second exchange. Deleting a client blocks future exchanges but does not revoke access tokens already issued to that client.
