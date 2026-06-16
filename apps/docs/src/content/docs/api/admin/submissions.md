---
title: "<route>GET</route> List submissions"
description: "<route>GET /api/v2/admin/submissions</route>"
order: 17
---

:::aside

::::route-example{def="GetAdminSubmissionsRouteV2"}

```json query
{
  "limit": 50,
  "offset": 0
}
```

::::

:::

::route-meta{def="GetAdminSubmissionsRouteV2"}

This route shows submission audit rows. The table records flag submissions and admin bot job submissions for review and abuse investigation.

Query parameters control pagination, sorting, and lightweight challenge or team search. [Filter submissions](/docs/api/admin/submission-filter/) adds category, division, kind, result, team status, and time filters.

::request-body{def="GetAdminSubmissionsRouteV2" source="query" title="Query parameters"}

::response-body{def="GetAdminSubmissionsRouteV2" response="goodAdminSubmissions" title="Response fields"}

Each row includes challenge metadata, team metadata, the source IP address, result details, and creation time.
