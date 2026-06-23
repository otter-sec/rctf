---
title: "<route>GET</route> Team detail"
description: "<route>GET /api/v2/admin/users/:id</route>"
order: 10
---

:::aside

::::route-example{def="GetAdminUserRouteV2"}

```json params
{
  "id": "team-id"
}
```

::::

:::

::route-meta{def="GetAdminUserRouteV2"}

This route shows full team details for the admin panel, including solve history. The token needs both `usersWrite{:ts}` and `challsRead{:ts}` because the response includes challenge solve data.

::request-body{def="GetAdminUserRouteV2" source="params" title="Path parameters"}

::response-body{def="GetAdminUserRouteV2" response="goodAdminUserV2" title="Response fields"}

Private account fields appear here, so this route belongs in trusted admin views.
