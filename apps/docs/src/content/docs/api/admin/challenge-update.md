---
title: "PUT Create or update challenge"
description: "PUT /api/[v2,v1]/admin/challs/:id"
order: 3
---

:::aside

::::tabs{sync="admin-challenge-update-version"}

:::tab[V2]

::::route-example{def="UpdateChallengeRouteV2" extra="BadJson,BadBody"}

```json body
{
  "data": {
    "name": "web demo",
    "category": "web",
    "author": "organizers",
    "description": "Solve it.",
    "flag": "flag{example}",
    "points": {
      "min": 100,
      "max": 500
    },
    "tiebreakEligible": true,
    "files": [
      {
        "name": "dist.zip",
        "url": "/uploads/dist.zip",
        "size": 12345
      }
    ],
    "sortWeight": 10,
    "hidden": false,
    "releaseTime": null
  }
}
```

```json params
{
  "id": "challenge-id"
}
```

::::

:::

:::tab[V1]

::::route-example{def="UpdateChallengeRoute" extra="BadJson,BadBody"}

```json body
{
  "data": {
    "name": "web demo",
    "category": "web",
    "author": "organizers",
    "description": "Solve it.",
    "flag": "flag{example}",
    "points": {
      "min": 100,
      "max": 500
    },
    "tiebreakEligible": true,
    "files": [
      {
        "name": "dist.zip",
        "url": "/uploads/dist.zip"
      }
    ],
    "sortWeight": 10
  }
}
```

```json params
{
  "id": "challenge-id"
}
```

::::

:::

::::

:::

::route-meta{def="UpdateChallengeRouteV2"}

This route creates a new challenge or updates an existing one. Fields left out of `data` keep their current values. Setting `instancerConfig{:ts}` or `adminBotConfig{:ts}` to `null{:ts}` clears that integration config.

After a challenge changes, the leaderboard is recalculated. The active instancer provider validates `instancerConfig{:ts}`, and the active admin bot provider validates `adminBotConfig{:ts}` before saving a new revision.

::::tabs{sync="admin-challenge-update-version"}

:::tab[V2]

::request-body{def="UpdateChallengeRouteV2" source="params" title="Path parameters"}

::request-body{def="UpdateChallengeRouteV2" title="Request body"}

:::

:::tab[V1]

::request-body{def="UpdateChallengeRoute" source="params" title="Path parameters"}

::request-body{def="UpdateChallengeRoute" title="Request body"}

:::

::::

::::tabs{sync="admin-challenge-update-version"}

:::tab[V2]

::response-body{def="UpdateChallengeRouteV2" response="goodChallengeUpdateV2" title="Response fields"}

:::

:::tab[V1]

::response-body{def="UpdateChallengeRoute" response="goodChallengeUpdate" title="Response fields"}

:::

::::

V1 does not include hidden state, scheduled release time, instancer config, admin bot config, or file sizes.
