---
title: "PUT Start an instance"
description: "PUT /api/v2/integrations/challs/:id/instance"
order: 4
---

:::aside

::::route-example{def="CreateInstanceRouteV2" extra="BadJson,BadBody"}

```json body
{
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

::route-meta{def="CreateInstanceRouteV2"}

This route asks the instancer provider to start an instance for the authenticated team. If the provider needs time to finish provisioning, the response can report `starting` before a later status request reports `running`.

Captcha is checked only when the deployment protects `instancerStart{:ts}`.

::request-body{def="CreateInstanceRouteV2" source="params" title="Path parameters"}

::request-body{def="CreateInstanceRouteV2" title="Request body"}

::response-body{def="CreateInstanceRouteV2" response="goodInstanceStatus" title="Response fields"}
