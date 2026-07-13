---
title: "`<route>GET</route>` Admin bot job logs"
description: "`<route>GET /api/v2/integrations/challs/:id/admin-bot/jobs/:jobId/logs</route>`"
order: 11
---

:::aside

::::route-example{def="GetAdminBotJobLogsRouteV2"}

```json params
{
  "id": "challenge-id",
  "jobId": "job-id"
}
```

::::

:::

::route-meta{def="GetAdminBotJobLogsRouteV2"}

This route gives the retained logs for a completed or failed admin bot job. The `logs` field is `null{:ts}` when logs are not available.

::request-body{def="GetAdminBotJobLogsRouteV2" source="params" title="Path parameters"}

::response-body{def="GetAdminBotJobLogsRouteV2" response="goodAdminBotJobLogs" title="Response fields"}
