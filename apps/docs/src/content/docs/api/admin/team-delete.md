---
title: "<route>DELETE</route> Delete team"
description: "<route>DELETE /api/v2/admin/users/:id</route>"
order: 12
---

:::aside

::::route-example{def="DeleteAdminUserRouteV2"}

```json params
{
  "id": "team-id"
}
```

::::

:::

::route-meta{def="DeleteAdminUserRouteV2"}

This route deletes a team account. Admin users are protected from deletion here.

This operation removes the team rather than hiding it from standings. [Update team](/docs/api/admin/team-update/) is the better fit when the intent is to ban a team while keeping its record.

::request-body{def="DeleteAdminUserRouteV2" source="params" title="Path parameters"}

#### Response

A successful request returns `<response>200 goodAdminUserDeleteV2</response>` with no data.
