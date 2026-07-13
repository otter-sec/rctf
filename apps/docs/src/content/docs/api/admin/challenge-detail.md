---
title: "`<route>GET</route>` Admin challenge detail"
description: "`<route>GET /api/[v2,v1]/admin/challs/:id</route>`"
order: 2
---

:::aside

::::tabs{sync="admin-challenge-detail-version"}

:::tab[V2]

::::route-example{def="GetAdminChallengeRouteV2"}

```json params
{
  "id": "challenge-id"
}
```

::::

:::

:::tab[V1]

::::route-example{def="GetAdminChallengeRoute"}

```json params
{
  "id": "challenge-id"
}
```

::::

:::

::::

:::

::route-meta{def="GetAdminChallengeRouteV2"}

This route reads one challenge with admin fields. The admin panel uses it when someone opens the challenge editor.

For new clients, V2 is usually the best fit. V1 returns the older admin challenge fields and remains available for existing integrations.

::::tabs{sync="admin-challenge-detail-version"}

:::tab[V2]

::request-body{def="GetAdminChallengeRouteV2" source="params" title="Path parameters"}

:::

:::tab[V1]

::request-body{def="GetAdminChallengeRoute" source="params" title="Path parameters"}

:::

::::

::::tabs{sync="admin-challenge-detail-version"}

:::tab[V2]

::response-body{def="GetAdminChallengeRouteV2" response="goodAdminChallengeV2" title="Response fields"}

:::

:::tab[V1]

::response-body{def="GetAdminChallengeRoute" response="goodAdminChallenge" title="Response fields"}

:::

::::

V1 challenge entries do not include `hidden`, `releaseTime`, `instancerConfig`, `adminBotConfig`, or file `size`.
