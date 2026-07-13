---
title: "`<route>POST</route>` Create team token"
description: "`<route>POST /api/v2/admin/users/:id/token</route>`"
order: 13
---

:::aside

::::route-example{def="CreateUserTokenRouteV2"}

```json params
{
  "id": "team-id"
}
```

::::

:::

::route-meta{def="CreateUserTokenRouteV2"}

This route creates a fresh team token. It helps organizers recover access for a team that has lost its original credential.

The returned token is a credential. This route does not issue tokens for admin users.

::request-body{def="CreateUserTokenRouteV2" source="params" title="Path parameters"}

::response-body{def="CreateUserTokenRouteV2" response="goodCreateUserTokenV2" title="Response fields"}
