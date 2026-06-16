---
title: "<route>POST</route> Submit admin bot job"
description: "<route>POST /api/v2/integrations/challs/:id/admin-bot</route>"
order: 8
---

:::aside

::::route-example{def="SubmitAdminBotJobRouteV2" extra="BadJson,BadBody"}

```json body
{
  "inputs": {
    "url": "https://challenge.example.com/"
  },
  "captchaCode": "optional-captcha-code"
}
```

```json params
{
  "id": "challenge-id"
}
```

::::

:::

::route-meta{def="SubmitAdminBotJobRouteV2" rateLimit="Burst `1`, refill window `10000` ms per user and challenge."}

This route submits an admin bot job for the authenticated team. Participants send values for the input names configured on the challenge.

Only one queued or running job is allowed per user and challenge. When the challenge depends on a running instance, the route returns `<response>400 badInstancerState</response>` if the instance is missing, stopped, or expires before the admin bot timeout.

::request-body{def="SubmitAdminBotJobRouteV2" source="params" title="Path parameters"}

::request-body{def="SubmitAdminBotJobRouteV2" title="Request body"}

::response-body{def="SubmitAdminBotJobRouteV2" response="goodAdminBotJobSubmitted" title="Response fields"}
