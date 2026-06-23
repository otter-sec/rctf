---
title: "<route>GET</route> Challenge list"
description: "<route>GET /api/[v2,v1]/challs</route>"
order: 1
---

:::aside

::::tabs{sync="challs-version"}

:::tab[V2]

::route-example{def="GetChallengesRouteV2"}

:::

:::tab[V1]

::route-example{def="GetChallengesRoute"}

:::

::::

:::

::route-meta{def="GetChallengesRouteV2"}

Returns the challenge list visible to the current request. Regular users do not receive hidden challenges or challenges with a future `releaseTime`.

For new clients, prefer V2. It adds instancer metadata, admin bot input schemas, and the `hasFlag` field. V1 remains available for older clients and returns the original challenge fields.

::::tabs{sync="challs-version"}

:::tab[V2]

::response-body{def="GetChallengesRouteV2" response="goodChallengesV2" title="Response fields"}

:::

:::tab[V1]

::response-body{def="GetChallengesRoute" response="goodChallenges" title="Response fields"}

:::

::::
