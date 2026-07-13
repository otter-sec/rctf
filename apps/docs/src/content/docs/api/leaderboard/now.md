---
title: "`<route>GET</route>` Current standings"
description: "`<route>GET /api/[v2,v1]/leaderboard/now</route>`"
order: 1
---

:::aside

::::tabs{sync="leaderboard-now-version"}

:::tab[V2]

::::route-example{def="GetLeaderboardRouteV2"}

```json query
{
  "limit": 50,
  "offset": 0
}
```

::::

:::

:::tab[V1]

::::route-example{def="GetLeaderboardRoute"}

```json query
{
  "limit": 50,
  "offset": 0
}
```

::::

:::

::::

:::

::route-meta{def="GetLeaderboardRouteV2" rateLimit="Search bucket per IP (burst `3`, refill window `3000` ms) when `search` is provided."}

Returns a page of the current standings from the leaderboard cache.

For new clients, prefer V2. It includes avatar, country, status, solve, dynamic score, division rank, and global rank fields. V1 remains available for older clients and returns the original `id`, `name`, and `score` fields.

V2 separates flag solves from external score-feed data. `solves{:ts}` contains actual challenge solves. `dynamicScores{:ts}` contains per-team points for dynamic challenges, plus the team's point delta from the latest scoring tick for that challenge.

::::tabs{sync="leaderboard-now-version"}

:::tab[V2]

`<route>GET /api/v2/leaderboard/now</route>` supports `limit`, `offset`, optional `division`, and optional `search`. Deployment config sets the maximum pagination values, and search values are expected to be 2 to 100 characters.

::request-body{def="GetLeaderboardRouteV2" source="query" title="Query parameters"}

:::

:::tab[V1]

`<route>GET /api/v1/leaderboard/now</route>` supports `limit`, `offset`, and optional `division`. Team name search is available through the V2 route.

::request-body{def="GetLeaderboardRoute" source="query" title="Query parameters"}

:::

::::

::::tabs{sync="leaderboard-now-version"}

:::tab[V2]

::response-body{def="GetLeaderboardRouteV2" response="goodLeaderboardV2" title="Response fields"}

:::

:::tab[V1]

::response-body{def="GetLeaderboardRoute" response="goodLeaderboard" title="Response fields"}

:::

::::

`globalPlace` is `null{:ts}` when a team is not included in global ranking. `divisionPlace` is the team's rank within the returned division.
