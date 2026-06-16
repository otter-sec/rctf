---
title: "<route>GET</route> CTFtime leaderboard"
description: "<route>GET /api/v1/integrations/ctftime/leaderboard</route>"
order: 13
---

:::aside

::curl-example{def="GetCtftimeLeaderboardRoute" baseUrl="https://rctf-new-dev.es3n1n.io"}

:::

::route-meta{def="GetCtftimeLeaderboardRoute"}

This V1 route provides the leaderboard export expected by CTFtime. It is the rare typed route that returns the body directly instead of using the rCTF response wrapper.

#### Response

The response body is the raw CTFtime leaderboard.

```json
{
  "standings": [
    {
      "pos": 1,
      "team": "otter-sec",
      "score": 1200
    }
  ]
}
```

| Field       | Type                                                  | Notes                   |
| ----------- | ----------------------------------------------------- | ----------------------- |
| `standings` | `{ pos: number, team: string, score: number }[]{:ts}` | Ordered standings rows. |
