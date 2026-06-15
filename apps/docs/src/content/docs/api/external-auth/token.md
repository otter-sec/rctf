---
title: "POST Exchange code for token"
description: "POST /api/v2/external-auth/token"
order: 3
---

:::aside

::::route-example{def="ExternalAuthTokenRouteV2" extra="BadJson,BadBody,BadExternalAuthRequest"}

```json body
{
  "clientId": "11111111-2222-3333-4444-555555555555",
  "clientSecret": "<32-byte base64url secret>",
  "code": "<single-use code from /authorize>"
}
```

::::

:::

::route-meta{def="ExternalAuthTokenRouteV2"}

Server-to-server exchange. The external service's backend trades the single-use code from the browser redirect for a regular rCTF auth token. Call this from a trusted environment - the client secret must not be exposed to the browser.

The code is consumed atomically: the first call deletes it from Redis, so a replay or any concurrent second exchange always fails.

:::note[Failures all look identical]

Unknown client, wrong secret, wrong code, expired code, reused code, and code/client mismatch all
  return the same `<response>400 badExternalAuthRequest</response>` body. Don't rely on the failure
  reason to debug an integration - check timestamps, secret rotation, and the exact bytes you sent
  instead.

:::

::request-body{def="ExternalAuthTokenRouteV2" title="Request body"}

::response-body{def="ExternalAuthTokenRouteV2" response="goodExternalAuthToken" title="Response fields"}

The returned `<red>accessToken</red>` is a regular rCTF auth token with no expiry - the same kind of token issued at login. Use it in `Authorization: Bearer <accessToken>` against any rCTF endpoint. There is no per-app token registry: deleting the client through the admin routes prevents future code exchanges but does not revoke tokens that were already minted.
