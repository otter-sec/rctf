---
title: "`<route>POST</route>` Complete admin bot job"
description: "`<route>POST /api/v2/admin/admin-bot/jobs/:id/complete</route>`"
order: 25
---

:::aside

::::route-example{def="CompleteAdminBotJobRouteV2" extra="BadJson,BadBody"}

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

::route-meta{def="CompleteAdminBotJobRouteV2"}

The admin bot worker calls this service route after a job finishes successfully. The request can include logs so organizers can review what happened later.

Logs are optional. When included, the server accepts up to `1048576` characters.

::request-body{def="CompleteAdminBotJobRouteV2" source="params" title="Path parameters"}

::request-body{def="CompleteAdminBotJobRouteV2" title="Request body"}

::response-body{def="CompleteAdminBotJobRouteV2" response="goodAdminBotJobUpdate" title="Response fields"}
