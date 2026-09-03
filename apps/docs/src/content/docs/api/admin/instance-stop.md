---
title: "`<route>DELETE</route>` Admin stop an instance"
description: "`<route>DELETE /api/v2/admin/challs/:id/instance</route>`"
order: 26
---

:::aside

::::route-example{def="DeleteAdminInstanceRouteV2"}

```json params
{
  "id": "challenge-id"
}
```

::::

:::

::route-meta{def="DeleteAdminInstanceRouteV2"}

This route is the admin copy of [Stop an instance](/api/integrations/instance-stop/). It stops the authenticated admin's own instance, and it also works for hidden challenges, challenges with a future `releaseTime`, and before the CTF starts.

::request-body{def="DeleteAdminInstanceRouteV2" source="params" title="Path parameters"}

::response-body{def="DeleteAdminInstanceRouteV2" response="goodInstanceStatus" title="Response fields"}
