---
title: "GET Public profile"
description: "GET /api/[v2,v1]/users/:id"
order: 1
---

:::aside

::::tabs{sync="users-profile-version"}

:::tab[V2]

::::route-example{def="GetUserRouteV2"}

```json params
{
  "id": "team-id"
}
```

::::

:::

:::tab[V1]

::::route-example{def="GetUserRoute"}

```json params
{
  "id": "team-id"
}
```

::::

:::

::::

:::

::route-meta{def="GetUserRouteV2"}

This route returns the public profile for one team. Public profiles are available after the CTF starts, and admin tokens with `challsRead{:ts}` can read through that gate.

For new clients, V2 is usually the best fit. It includes avatar URL, country or region code, status text, and `bloodIndex` on solve rows. V1 remains available for older clients.

::request-body{def="GetUserRouteV2" source="params" title="Path parameters"}

::::tabs{sync="users-profile-version"}

:::tab[V2]

::response-body{def="GetUserRouteV2" response="goodUserDataV2" title="Response fields"}

:::

:::tab[V1]

::response-body{def="GetUserRoute" response="goodUserData" title="Response fields"}

:::

::::
