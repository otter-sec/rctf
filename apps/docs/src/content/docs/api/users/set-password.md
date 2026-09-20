---
title: "`<route>PUT</route>` Set password auth"
description: "`<route>PUT /api/v2/users/me/auth/password</route>`"
order: 7
---

:::aside

::::route-example{def="SetPasswordRouteV2" extra="BadJson,BadBody"}

```json body
{
  "password": "a-long-team-password",
  "currentPassword": "the-previous-password"
}
```

::::

:::

::route-meta{def="SetPasswordRouteV2" rateLimit="Password change bucket. Burst `3`, refill window `180000` ms per user. Consumed before anything else in the request."}

This route sets the authenticated team's password, or replaces the one it already has. It is available in V2. The new password must be 8 to 128 characters, and a value outside that range returns `<response>400 badPassword</response>`.

`currentPassword` is required whenever the account already has a password. [Own profile](/api/users/self/) reports that as `hasPassword`. A missing or wrong `currentPassword` returns `<response>401 badCredentials</response>`, which keeps a stolen auth token from locking the real owner out. On an account with no password yet, `currentPassword` is ignored.

::request-body{def="SetPasswordRouteV2" title="Request body"}

#### Response

A successful request returns `<response>200 goodPasswordSet</response>`.

Setting a password raises the account's [token epoch](/api/auth#token-revocation), so every auth and team token issued before the change is rejected from that point on, including the one that made the request. The response carries a replacement `authToken`, and a client that does not store it will be logged out on its next call.

::response-body{def="SetPasswordRouteV2" response="goodPasswordSet" title="Response fields"}
