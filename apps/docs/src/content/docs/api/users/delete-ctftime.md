---
title: "DELETE Remove CTFtime auth"
description: "DELETE /api/v1/users/me/auth/ctftime"
order: 8
---

:::aside

::route-example{def="DeleteCtftimeRoute"}

:::

::route-meta{def="DeleteCtftimeRoute"}

This route removes CTFtime auth from the authenticated team. It is available in V1.

If removing CTFtime auth would leave the team without either email auth or CTFtime auth, the route returns `<response>409 badZeroAuth</response>`.

#### Response

A successful request returns `<response>200 goodCtftimeRemoved</response>` with no data.
