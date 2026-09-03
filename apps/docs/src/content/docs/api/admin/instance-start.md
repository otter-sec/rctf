---
title: "`<route>PUT</route>` Admin start an instance"
description: "`<route>PUT /api/v2/admin/challs/:id/instance</route>`"
order: 24
---

:::aside

::::route-example{def="CreateAdminInstanceRouteV2"}

```json params
{
  "id": "challenge-id"
}
```

::::

:::

::route-meta{def="CreateAdminInstanceRouteV2"}

This route is the admin copy of [Start an instance](/api/integrations/instance-start/). It starts an instance for the authenticated admin's own team, and it also works for hidden challenges, challenges with a future `releaseTime`, and before the CTF starts.

::request-body{def="CreateAdminInstanceRouteV2" source="params" title="Path parameters"}

::response-body{def="CreateAdminInstanceRouteV2" response="goodInstanceStatus" title="Response fields"}
