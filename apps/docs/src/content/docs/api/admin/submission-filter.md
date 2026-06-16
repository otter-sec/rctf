---
title: "<route>POST</route> Filter submissions"
description: "<route>POST /api/v2/admin/submissions</route>"
order: 18
---

:::aside

::::route-example{def="FilterAdminSubmissionsRouteV2" extra="BadJson,BadBody"}

```json body
{
  "challenge": {
    "include": [
      "challenge-id"
    ]
  },
  "team": {
    "include": [
      "team-id"
    ]
  },
  "kind": {
    "include": [
      "flag"
    ]
  },
  "result": {
    "exclude": [
      "incorrect"
    ]
  },
  "teamStatus": {
    "include": [
      "not_banned"
    ]
  },
  "category": {
    "include": [
      "web"
    ]
  },
  "division": {
    "include": [
      "open"
    ]
  },
  "createdAfter": "2026-05-05T09:30:00.000Z",
  "createdBefore": "2026-05-05T10:30:00.000Z"
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

::route-meta{def="FilterAdminSubmissionsRouteV2"}

This route lists submission audit rows with richer filters. The query string still controls pagination, sorting, and lightweight text search.

Filter objects can include nullable `include` and `exclude` arrays. Date filters are parsed as ISO timestamps, and `createdAfter` needs to be earlier than `createdBefore` when both are provided.

::request-body{def="FilterAdminSubmissionsRouteV2" source="query" title="Query parameters"}

::request-body{def="FilterAdminSubmissionsRouteV2" title="Request body"}

::response-body{def="FilterAdminSubmissionsRouteV2" response="goodAdminSubmissions" title="Response fields"}
