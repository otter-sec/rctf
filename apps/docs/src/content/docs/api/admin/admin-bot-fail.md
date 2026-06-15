---
title: "POST Fail admin bot job"
description: "POST /api/v2/admin/admin-bot/jobs/:id/fail"
order: 26
---

:::aside

::::route-example{def="FailAdminBotJobRouteV2" extra="BadJson,BadBody"}

```json body
{
  "logs": "newline-delimited log data"
}
```

```json params
{
  "id": "job-id"
}
```

::::

:::

::route-meta{def="FailAdminBotJobRouteV2"}

The admin bot worker calls this service route when a job cannot complete successfully. The request can include logs so organizers can inspect the failure.

Logs are optional. When included, the server accepts up to `1048576` characters.

::request-body{def="FailAdminBotJobRouteV2" source="params" title="Path parameters"}

::request-body{def="FailAdminBotJobRouteV2" title="Request body"}

::response-body{def="FailAdminBotJobRouteV2" response="goodAdminBotJobUpdate" title="Response fields"}
