---
title: "`<route>GET</route>` Admin instance status"
description: "`<route>GET /api/v2/admin/challs/:id/instance</route>`"
order: 23
---

:::aside

::::route-example{def="GetAdminInstanceStatusRouteV2"}

```json params
{
  "id": "challenge-id"
}
```

::::

:::

::route-meta{def="GetAdminInstanceStatusRouteV2"}

This route is the admin copy of [Instance status](/api/integrations/instance-status/). It reports the authenticated admin's own instance for the challenge, and it also works for hidden challenges, challenges with a future `releaseTime`, and before the CTF starts. The admin panel uses it on the challenge editor's instancer tab.

::request-body{def="GetAdminInstanceStatusRouteV2" source="params" title="Path parameters"}

::response-body{def="GetAdminInstanceStatusRouteV2" response="goodInstanceStatus" title="Response fields"}
