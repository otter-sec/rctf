---
title: "`<route>POST</route>` Admin run an instance action"
description: "`<route>POST /api/v2/admin/challs/:id/instance/actions/:action</route>`"
order: 27
---

:::aside

::::route-example{def="RunAdminInstanceActionRouteV2"}

```json params
{
  "id": "challenge-id",
  "action": "restart"
}
```

::::

:::

::route-meta{def="RunAdminInstanceActionRouteV2"}

This route is the admin copy of `<route>POST /api/v2/integrations/challs/:id/instance/actions/:action</route>`. It runs a provider-defined action against the authenticated admin's own instance, and it also works for hidden challenges, challenges with a future `releaseTime`, and before the CTF starts.

::request-body{def="RunAdminInstanceActionRouteV2" source="params" title="Path parameters"}

::response-body{def="RunAdminInstanceActionRouteV2" response="goodInstancerActionResult" title="Response fields"}
