---
title: "GET Instance status"
description: "GET /api/v2/integrations/challs/:id/instance"
order: 3
---

:::aside

::::route-example{def="GetInstanceStatusRouteV2"}

```json params
{
  "id": "challenge-id"
}
```

::::

:::

::route-meta{def="GetInstanceStatusRouteV2"}

This route gives the authenticated team's current instance state for a challenge. It is used to show whether the instance is stopped, starting, running, stopping, or in an error state.

When no instancer provider is configured, or when the challenge has no instancer settings, the route returns `<response>404 badEndpoint</response>`. Provider errors return `<response>400 badInstancerError</response>` with a provider message.

::request-body{def="GetInstanceStatusRouteV2" source="params" title="Path parameters"}

::response-body{def="GetInstanceStatusRouteV2" response="goodInstanceStatus" title="Response fields"}

`endpoints` are returned in the order configured for the challenge. Endpoint kinds include `tcp`, `tcp-ssl`, `http`, and `https`.
