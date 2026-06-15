---
title: "PUT Update team"
description: "PUT /api/v2/admin/users/:id"
order: 11
---

:::aside

::::route-example{def="UpdateAdminUserRouteV2" extra="BadJson,BadBody"}

```json body
{
  "data": {
    "banned": true
  }
}
```

```json params
{
  "id": "team-id"
}
```

::::

:::

::route-meta{def="UpdateAdminUserRouteV2"}

This route changes admin controlled team state. The current route supports banning and unbanning teams.

Banning removes the team from leaderboard output after recalculation without deleting solves. Unbanning restores its rank after the leaderboard is recalculated. Admin users are protected from changes through this route.

::request-body{def="UpdateAdminUserRouteV2" source="params" title="Path parameters"}

::request-body{def="UpdateAdminUserRouteV2" title="Request body"}

#### Response

A successful request returns `<response>200 goodAdminUserUpdateV2</response>` with no data.
