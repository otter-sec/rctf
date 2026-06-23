---
title: "<route>GET</route> Admin challenge list"
description: "<route>GET /api/[v2,v1]/admin/challs</route>"
order: 1
---

:::aside

::::tabs{sync="admin-challenge-list-version"}

:::tab[V2]

::route-example{def="GetAdminChallengesRouteV2"}

:::

:::tab[V1]

::route-example{def="GetAdminChallengesRoute"}

:::

::::

:::

::route-meta{def="GetAdminChallengesRouteV2"}

This route shows every challenge with admin fields. Hidden and unreleased challenges are included so the admin panel can display the full challenge set.

For new clients, V2 is usually the best fit. It includes hidden state, release time, instancer config, admin bot config, and file sizes. V1 remains available for older admin tooling.

::::tabs{sync="admin-challenge-list-version"}

:::tab[V2]

::response-body{def="GetAdminChallengesRouteV2" response="goodAdminChallengesV2" title="Response fields"}

:::

:::tab[V1]

::response-body{def="GetAdminChallengesRoute" response="goodAdminChallenges" title="Response fields"}

:::

::::

V1 challenge entries do not include `hidden`, `releaseTime`, `instancerConfig`, `adminBotConfig`, or file `size`.
