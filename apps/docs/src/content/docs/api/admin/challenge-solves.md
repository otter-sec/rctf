---
title: "`<route>GET</route>` Admin challenge solves"
description: "`<route>GET /api/v2/admin/challs/:id/solves</route>`"
order: 3
---

:::aside

::::route-example{def="GetAdminChallengeSolvesRouteV2"}

```json params
{
  "id": "challenge-id"
}
```

```json query
{
  "limit": 100,
  "offset": 0
}
```

::::

:::

::route-meta{def="GetAdminChallengeSolvesRouteV2"}

This route is the admin copy of [Challenge solves](/api/challenges/solves/). It returns the same solve rows, but it also works for hidden challenges, challenges with a future `releaseTime`, and before the CTF starts. The admin panel uses it on the challenge editor's solves tab.

The only check is the `challsRead{:ts}` permission. Unknown challenge IDs return `<response>404 badChallenge</response>`.

::request-body{def="GetAdminChallengeSolvesRouteV2" source="params" title="Path parameters"}

::request-body{def="GetAdminChallengeSolvesRouteV2" source="query" title="Query parameters"}

::response-body{def="GetAdminChallengeSolvesRouteV2" response="goodChallengeSolvesV2" title="Response fields"}
