---
title: "`<route>POST</route>` Authorize"
description: "`<route>POST /api/v2/external-auth/authorize</route>`"
order: 2
---

:::aside

::::route-example{def="AuthorizeExternalAuthRouteV2" extra="BadJson,BadBody,BadExternalAuthRequest"}

```json body
{
  "clientId": "11111111-2222-3333-4444-555555555555",
  "redirectUri": "https://my-service.example.com/auth/rctf/callback",
  "state": "opaque-csrf-token"
}
```

::::

:::

::route-meta{def="AuthorizeExternalAuthRouteV2"}

Mints a single-use authorization code for the signed-in user and returns the URL the browser should navigate to next. The consent page calls this when the user clicks Authorize.

The `<red>redirectUri</red>` must match what the client was registered with byte-for-byte (no wildcards, no path normalization). Any mismatch returns `<response>400 badExternalAuthRequest</response>` - the response intentionally doesn't distinguish "unknown client" from "wrong redirect URI" so the endpoint can't be probed.

::request-body{def="AuthorizeExternalAuthRouteV2" title="Request body"}

::response-body{def="AuthorizeExternalAuthRouteV2" response="goodExternalAuthAuthorize" title="Response fields"}

The returned `<red>redirectTo</red>` appends `code=...` to the registered `<red>redirectUri</red>`, along with `state=...` when the request provides one. It uses `?` or `&` as needed for the registered URI. The code expires from Redis after 60 seconds and is deleted by the first `<route>POST /api/v2/external-auth/token</route>` call.

The `<red>state</red>` value is opaque to rCTF and is passed through verbatim. It is the integrator's responsibility to use it for CSRF protection.
