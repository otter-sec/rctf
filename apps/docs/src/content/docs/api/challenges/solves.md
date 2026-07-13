---
title: "`<route>GET</route>` Challenge solves"
description: "`<route>GET /api/[v2,v1]/challs/:id/solves</route>`"
order: 2
---

:::aside

::::tabs{sync="solves-version"}

:::tab[V2]

::::route-example{def="GetChallengeSolvesRouteV2"}

```json query
{
  "limit": 100,
  "offset": 0
}
```

::::

:::

:::tab[V1]

::::route-example{def="GetChallengeSolvesRoute"}

```json query
{
  "limit": 100,
  "offset": 0
}
```

::::

:::

::::

:::

::route-meta{def="GetChallengeSolvesRouteV2"}

Returns a page of solve history for one challenge.

V2 includes solve avatars, country codes, division placements, blood index, and the authenticated user's `mySolvePosition` when optional auth is present. V1 remains available for older clients and returns a smaller solve row.

::request-body{def="GetChallengeSolvesRouteV2" source="params" title="Path parameters"}

::request-body{def="GetChallengeSolvesRouteV2" source="query" title="Query parameters"}

::::tabs{sync="solves-version"}

:::tab[V2]

::response-body{def="GetChallengeSolvesRouteV2" response="goodChallengeSolvesV2" title="Response fields"}

:::

:::tab[V1]

::response-body{def="GetChallengeSolvesRoute" response="goodChallengeSolves" title="Response fields"}

:::

::::
