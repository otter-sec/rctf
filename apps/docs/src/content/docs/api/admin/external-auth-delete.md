---
title: "`<route>DELETE</route>` Delete external-auth client"
description: "`<route>DELETE /api/v2/admin/external-auth/clients/:id</route>`"
order: 30
---

:::aside

::::route-example{def="DeleteExternalAuthClientRouteV2"}

```json params
{
  "id": "11111111-2222-3333-4444-555555555555"
}
```

::::

:::

::route-meta{def="DeleteExternalAuthClientRouteV2"}

Removes an external-auth client. After this returns, `<route>POST /api/v2/external-auth/token</route>` exchanges with that `clientId` always fail with `<response>400 badExternalAuthRequest</response>`.

Deleting a client does not revoke access tokens it already issued. Rotating the global `tokenKey` invalidates them, but also invalidates every other rCTF token.

Unknown client IDs return `<response>400 badExternalAuthRequest</response>`.

::request-body{def="DeleteExternalAuthClientRouteV2" source="params" title="Path parameters"}

#### Response

A successful request returns `<response>200 goodAdminExternalAuthClientDelete</response>` with no data.
