---
title: "<route>GET</route> Standings with graph"
description: "<route>GET /api/v2/leaderboard/with-graph</route>"
order: 2
---

:::aside

::::route-example{def="GetLeaderboardWithGraphRoute"}

```json query
{
  "limit": 50,
  "offset": 0
}
```

::::

:::

::route-meta{def="GetLeaderboardWithGraphRoute" rateLimit="Search bucket per IP (burst `3`, refill window `3000` ms) when `search` is provided."}

Returns the same standings data as [current standings](/docs/api/leaderboard/now/), along with graph samples. This is useful when a page renders the standings table and score graph together.

Supports `limit`, `offset`, optional `division`, and optional `search`. Deployment config sets the maximum pagination values, and search values are expected to be 2 to 100 characters.

::request-body{def="GetLeaderboardWithGraphRoute" source="query" title="Query parameters"}

::response-body{def="GetLeaderboardWithGraphRoute" response="goodLeaderboardWithGraph" title="Response fields"}

`<red>leaderboard</red>[]` uses the same fields as the V2 standings route. `<red>graph</red>[]` contains the teams included in the cached graph sample set.
