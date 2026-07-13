---
title: "`<route>POST</route>` Exchange code for token"
description: "`<route>POST /api/v2/external-auth/token</route>`"
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

The external service's backend exchanges the single-use code for an rCTF auth token. Make this request from a trusted server and never expose the client secret to the browser.

The code can only be exchanged once. Repeated or concurrent requests fail.

:::note[Failures all look identical]

Unknown client, wrong secret, wrong code, expired code, reused code, and code/client mismatch all
  return the same `<response>400 badExternalAuthRequest</response>` body. To debug a failure,
  check the timestamp, current secret, client ID, and exact code sent by the service.

:::

::request-body{def="ExternalAuthTokenRouteV2" title="Request body"}

::response-body{def="ExternalAuthTokenRouteV2" response="goodExternalAuthToken" title="Response fields"}

The returned `<red>accessToken</red>` is the same non-expiring token issued at login. Use it in `Authorization: Bearer <accessToken>` against any rCTF endpoint. Deleting the client prevents future code exchanges but does not revoke tokens already issued through that client.
