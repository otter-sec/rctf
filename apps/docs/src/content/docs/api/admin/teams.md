---
title: "<route>GET</route> List teams"
description: "<route>GET /api/v2/admin/users</route>"
order: 8
---

:::aside

::::route-example{def="GetAdminUsersRouteV2"}

```json query
{
  "limit": 50,
  "offset": 0
}
```

::::

:::

::route-meta{def="GetAdminUsersRouteV2"}

This route shows teams for the admin panel. Query parameters control pagination, sorting, and name or email search.

[Filter teams](/api/admin/team-filter/) is available when a UI also needs status or division filters.

::request-body{def="GetAdminUsersRouteV2" source="query" title="Query parameters"}

::response-body{def="GetAdminUsersRouteV2" response="goodAdminUsersV2" title="Response fields"}

Each list item includes public profile fields, admin state, cached score data, and creation time.
