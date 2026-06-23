---
title: "<route>DELETE</route> Remove email auth"
description: "<route>DELETE /api/v1/users/me/auth/email</route>"
order: 6
---

:::aside

::route-example{def="DeleteEmailRoute"}

:::

::route-meta{def="DeleteEmailRoute"}

This route removes email auth from the authenticated team. It is available in V1.

If removing email auth would leave the team without either email auth or CTFtime auth, the route returns `<response>409 badZeroAuth</response>`.

#### Response

A successful request returns `<response>200 goodEmailRemoved</response>` with no data.
