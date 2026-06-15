---
title: "DELETE Delete a solve"
description: "DELETE /api/v2/admin/challs/:challengeId/solves/:userId"
order: 4
---

:::aside

::::route-example{def="DeleteChallengeSolveRouteV2"}

```json params
{
  "challengeId": "challenge-id",
  "userId": "team-id"
}
```

::::

:::

::route-meta{def="DeleteChallengeSolveRouteV2"}

This route removes one solve for a specific team and challenge. The challenge and team remain in place, and the leaderboard is recalculated after the solve is removed.

::request-body{def="DeleteChallengeSolveRouteV2" source="params" title="Path parameters"}

#### Response

A successful request returns `<response>200 goodChallengeSolveDeleteV2</response>` with no data.
