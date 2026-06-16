---
title: "<route>POST</route> Filter teams"
description: "<route>POST /api/v2/admin/users</route>"
order: 9
---

:::aside

::::route-example{def="FilterAdminUsersRouteV2" extra="BadJson,BadBody"}

```json body
{
  "status": {
    "include": [
      "active"
    ]
  },
  "division": {
    "include": [
      "open"
    ]
  }
}
```

```json query
{
  "limit": 50,
  "offset": 0
}
```

::::

:::

::route-meta{def="FilterAdminUsersRouteV2"}

This route lists teams with richer filters than the GET route can carry comfortably. The query string still controls pagination, sorting, and text search.

Filter objects can include nullable `include` and `exclude` arrays. A field can be omitted when that filter does not apply.

::request-body{def="FilterAdminUsersRouteV2" source="query" title="Query parameters"}

::request-body{def="FilterAdminUsersRouteV2" title="Request body"}

::response-body{def="FilterAdminUsersRouteV2" response="goodAdminUsersV2" title="Response fields"}
