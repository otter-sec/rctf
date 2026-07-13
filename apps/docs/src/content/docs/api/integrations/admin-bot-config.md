---
title: "`<route>GET</route>` Admin bot config"
description: "`<route>GET /api/v2/integrations/challs/:id/admin-bot/config</route>`"
order: 7
---

:::aside

::::route-example{def="GetAdminBotConfigRouteV2"}

```json params
{
  "id": "challenge-id"
}
```

::::

:::

::route-meta{def="GetAdminBotConfigRouteV2"}

This route gives participants the released admin bot challenge source and the file extension for that source. Challenge authors can use this to show the exact code participants will write against.

::request-body{def="GetAdminBotConfigRouteV2" source="params" title="Path parameters"}

::response-body{def="GetAdminBotConfigRouteV2" response="goodAdminBotConfig" title="Response fields"}
