---
title: "`<route>GET</route>` Score graph"
description: "`<route>GET /api/[v2,v1]/leaderboard/graph</route>`"
order: 3
---

:::aside

::::tabs{sync="leaderboard-graph-version"}

:::tab[V2]

::::route-example{def="GetLeaderboardGraphRouteV2"}

```json query
{
  "limit": 10,
  "offset": 0
}
```

::::

:::

:::tab[V1]

::::route-example{def="GetLeaderboardGraphRoute"}

```json query
{
  "limit": 10
}
```

::::

:::

::::

:::

::route-meta{def="GetLeaderboardGraphRouteV2"}

Returns score graph data from the leaderboard cache.

The graph uses samples cached by the leaderboard worker. `leaderboard.graphMaxTeams` limits the number of teams in the graph, and `leaderboard.graphSampleTime` sets the interval between samples.

::::tabs{sync="leaderboard-graph-version"}

:::tab[V2]

`<route>GET /api/v2/leaderboard/graph</route>` supports `limit`, `offset`, and optional `division`. Team name search is available on the standings routes.

::request-body{def="GetLeaderboardGraphRouteV2" source="query" title="Query parameters"}

:::

:::tab[V1]

`<route>GET /api/v1/leaderboard/graph</route>` supports `limit` and optional `division`. Offset based graph pagination is available through the V2 route.

::request-body{def="GetLeaderboardGraphRoute" source="query" title="Query parameters"}

:::

::::

::::tabs{sync="leaderboard-graph-version"}

:::tab[V2]

::response-body{def="GetLeaderboardGraphRouteV2" response="goodLeaderboardGraph" title="Response fields"}

:::

:::tab[V1]

::response-body{def="GetLeaderboardGraphRoute" response="goodLeaderboardGraph" title="Response fields"}

:::

::::
