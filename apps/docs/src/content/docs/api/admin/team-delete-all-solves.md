---
title: "`<route>DELETE</route>` Delete all team solves"
description: "`<route>DELETE /api/v2/admin/users/:userId/solves</route>`"
order: 32
---

:::aside

::::route-example{def="DeleteAllChallengeSolvesRouteV2"}

```json params
{
  "userId": "team-id"
}
```

::::

:::

::route-meta{def="DeleteAllChallengeSolvesRouteV2"}

This route removes every solve for a specific team. Challenges and team remain in place, and the leaderboard is recalculated after the solves are removed.

If the team has no solves, the request succeeds without making any changes.

::request-body{def="DeleteAllChallengeSolvesRouteV2" source="params" title="Path parameters"}

#### Response

A successful request returns `<response>200 goodAllChallengeSolvesDeleteV2</response>` with no data.
