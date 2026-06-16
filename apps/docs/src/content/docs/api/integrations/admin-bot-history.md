---
title: "<route>GET</route> Admin bot job history"
description: "<route>GET /api/v2/integrations/challs/:id/admin-bot/history</route>"
order: 10
---

:::aside

::::route-example{def="GetAdminBotJobHistoryRouteV2"}

```json params
{
  "id": "challenge-id"
}
```

::::

:::

::route-meta{def="GetAdminBotJobHistoryRouteV2"}

This route gives the retained completed and failed admin bot jobs for the authenticated team on a challenge. It is useful for showing recent submissions without including the full log body in the list.

::request-body{def="GetAdminBotJobHistoryRouteV2" source="params" title="Path parameters"}

::response-body{def="GetAdminBotJobHistoryRouteV2" response="goodAdminBotJobHistory" title="Response fields"}
