---
title: "`<route>GET</route>` Admin bot source"
description: "`<route>GET /api/v2/admin/admin-bot/challenges/:id/source</route>`"
order: 25
---

:::aside

::::route-example{def="GetAdminBotChallengeSourceRouteV2"}

```json params
{
  "id": "challenge-id"
}
```

::::

:::

::route-meta{def="GetAdminBotChallengeSourceRouteV2"}

The admin bot worker calls this service route to read the source code saved for a challenge config revision.

The request is authenticated with the shared admin bot bearer token from `adminBot.provider.options.secretKey{:yaml}` in `rctf.d/{:dir}`.

::request-body{def="GetAdminBotChallengeSourceRouteV2" source="params" title="Path parameters"}

::response-body{def="GetAdminBotChallengeSourceRouteV2" response="goodAdminBotChallengeSource" title="Response fields"}
