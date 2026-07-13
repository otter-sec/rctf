---
title: "`<route>POST</route>` CTFtime callback"
description: "`<route>POST /api/v1/integrations/ctftime/callback</route>`"
order: 12
---

:::aside

::::route-example{def="CtftimeCallbackRoute" extra="BadJson,BadBody"}

```json body
{
  "ctftimeCode": "oauth-code"
}
```

::::

:::

::route-meta{def="CtftimeCallbackRoute"}

This V1 route exchanges a CTFtime OAuth code for a short lived CTFtime auth token. That token can then be used with registration, verification, login, or account linking flows.

::request-body{def="CtftimeCallbackRoute" title="Request body"}

::response-body{def="CtftimeCallbackRoute" response="goodCtftimeToken" title="Response fields"}
