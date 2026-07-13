---
title: "`<route>PATCH</route>` Update profile"
description: "`<route>PATCH /api/[v2,v1]/users/me</route>`"
order: 3
---

:::aside

::::tabs{sync="users-update-version"}

:::tab[V2]

::::route-example{def="UpdateUserRouteV2" extra="BadJson,BadBody"}

```json body
{
  "name": "new team name",
  "division": "open",
  "countryCode": "US",
  "statusText": "solving web"
}
```

::::

:::

:::tab[V1]

::::route-example{def="UpdateUserRoute" extra="BadJson,BadBody"}

```json body
{
  "name": "new team name",
  "division": "open"
}
```

::::

:::

::::

:::

::route-meta{def="UpdateUserRouteV2" rateLimit="Profile update bucket. Burst `3` and refill window `180000` ms per user."}

V2 can update the authenticated team's name, division, country or region code, and status text. V1 supports only the name and division. Changes refresh the team's cached profile and leaderboard entry.

Every request uses the same profile rate-limit bucket, regardless of the fields it changes. A new division must be allowed for the team's current email address.

Division changes stop when the competition ends because they affect the final standings. Other fields remain editable. V2 returns `badDivisionChangeEnded`, while V1 returns `badBody`.

::::tabs{sync="users-update-version"}

:::tab[V2]

::request-body{def="UpdateUserRouteV2" title="Request body"}

:::

:::tab[V1]

::request-body{def="UpdateUserRoute" title="Request body"}

:::

::::

::::tabs{sync="users-update-version"}

:::tab[V2]

::response-body{def="UpdateUserRouteV2" response="goodUserUpdateV2" title="Response fields"}

:::

:::tab[V1]

::response-body{def="UpdateUserRoute" response="goodUserUpdate" title="Response fields"}

:::

::::
