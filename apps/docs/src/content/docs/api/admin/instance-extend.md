---
title: "`<route>PATCH</route>` Admin extend an instance"
description: "`<route>PATCH /api/v2/admin/challs/:id/instance</route>`"
order: 25
---

:::aside

::::route-example{def="ExtendAdminInstanceRouteV2"}

```json params
{
  "id": "challenge-id"
}
```

::::

:::

::route-meta{def="ExtendAdminInstanceRouteV2"}

This route is the admin copy of [Extend an instance](/api/integrations/instance-extend/). It extends the authenticated admin's own running instance, and it also works for hidden challenges, challenges with a future `releaseTime`, and before the CTF starts.

::request-body{def="ExtendAdminInstanceRouteV2" source="params" title="Path parameters"}

::response-body{def="ExtendAdminInstanceRouteV2" response="goodInstanceStatus" title="Response fields"}
