---
title: "`<route>DELETE</route>` Delete a challenge"
description: "`<route>DELETE /api/v1/admin/challs/:id</route>`"
order: 5
---

:::aside

::::route-example{def="DeleteChallengeRoute"}

```json params
{
  "id": "challenge-id"
}
```

::::

:::

::route-meta{def="DeleteChallengeRoute"}

This legacy V1 route removes a challenge and its solves. There is no V2 delete route. V2 admin clients remove solves directly and update challenge data through [create or update challenge](/api/admin/challenge-update/).

The leaderboard is recalculated after the challenge is removed.

::request-body{def="DeleteChallengeRoute" source="params" title="Path parameters"}

#### Response

A successful request returns `<response>200 goodChallengeDelete</response>` with no data.
