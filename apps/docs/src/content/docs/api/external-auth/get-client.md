---
title: "GET Get client metadata"
description: "GET /api/v2/external-auth/clients/:id"
order: 1
---

:::aside

::::route-example{def="GetExternalAuthClientRouteV2" extra="BadExternalAuthRequest"}

```json params
{
  "id": "11111111-2222-3333-4444-555555555555"
}
```

::::

:::

::route-meta{def="GetExternalAuthClientRouteV2"}

Public lookup for the consent page. The page calls this route with the `client_id` from the query string to render the app name and verify the redirect URI before showing the consent prompt. The endpoint never returns the client secret.

Unknown ids return `<response>400 badExternalAuthRequest</response>` - the same response used for every other failure mode in the [External auth](/docs/api/external-auth/) flow.

::request-body{def="GetExternalAuthClientRouteV2" source="params" title="Path parameters"}

::response-body{def="GetExternalAuthClientRouteV2" response="goodExternalAuthClient" title="Response fields"}
