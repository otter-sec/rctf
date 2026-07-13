---
title: "`<route>DELETE</route>` Stop an instance"
description: "`<route>DELETE /api/v2/integrations/challs/:id/instance</route>`"
order: 6
---

:::aside

::::route-example{def="DeleteInstanceRouteV2"}

```json params
{
  "id": "challenge-id"
}
```

::::

:::

::route-meta{def="DeleteInstanceRouteV2"}

This route asks the instancer provider to stop the authenticated team's instance. The response reports the latest state returned by the provider.

::request-body{def="DeleteInstanceRouteV2" source="params" title="Path parameters"}

::response-body{def="DeleteInstanceRouteV2" response="goodInstanceStatus" title="Response fields"}
