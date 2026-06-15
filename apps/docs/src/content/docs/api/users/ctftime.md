---
title: "PUT Set CTFtime auth"
description: "PUT /api/v1/users/me/auth/ctftime"
order: 7
---

:::aside

::::route-example{def="SetCtftimeRoute" extra="BadJson,BadBody"}

```json body
{
  "ctftimeToken": "<ctftime-token>"
}
```

::::

:::

::route-meta{def="SetCtftimeRoute"}

This route links the authenticated team to a CTFtime team by using a CTFtime auth token. It is available in V1.

When CTFtime auth is not configured, the route returns `<response>404 badEndpoint</response>`.

::request-body{def="SetCtftimeRoute" title="Request body"}

#### Response

A successful request returns `<response>200 goodCtftimeAuthSet</response>` with no data.
