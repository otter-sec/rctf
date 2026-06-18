---
title: "<route>GET</route> Own profile"
description: "<route>GET /api/[v2,v1]/users/me</route>"
order: 2
---

:::aside

::::tabs{sync="users-self-version"}

:::tab[V2]

::route-example{def="GetUserSelfRouteV2"}

:::

:::tab[V1]

::route-example{def="GetUserSelfRoute"}

:::

::::

:::

::route-meta{def="GetUserSelfRouteV2"}

This route returns the authenticated team's profile, including private account fields. It is useful for account settings, profile screens, and client side session state.

V2 includes the same public profile additions as [public profile](/api/users/profile/). V1 returns the older profile fields and remains available for clients that already use it.

::::tabs{sync="users-self-version"}

:::tab[V2]

::response-body{def="GetUserSelfRouteV2" response="goodUserSelfDataV2" title="Response fields"}

:::

:::tab[V1]

::response-body{def="GetUserSelfRoute" response="goodUserSelfData" title="Response fields"}

:::

::::

Treat `teamToken` as a credential. It can be used for account recovery and team scoped auth flows.
