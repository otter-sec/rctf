---
title: "GET Admin bot job status"
description: "GET /api/v2/integrations/challs/:id/admin-bot/status"
order: 9
---

:::aside

::::route-example{def="GetAdminBotJobStatusRouteV2"}

```json params
{
  "id": "challenge-id"
}
```

::::

:::

::route-meta{def="GetAdminBotJobStatusRouteV2"}

This route gives the authenticated team's active admin bot job for a challenge. The `job` field is `null{:ts}` when there is no queued or running job.

::request-body{def="GetAdminBotJobStatusRouteV2" source="params" title="Path parameters"}

::response-body{def="GetAdminBotJobStatusRouteV2" response="goodAdminBotJobStatus" title="Response fields"}
