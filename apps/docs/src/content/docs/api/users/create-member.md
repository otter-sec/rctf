---
title: "<route>POST</route> Add a team member"
description: "<route>POST /api/v1/users/me/members</route>"
order: 10
---

:::aside

::::route-example{def="CreateMemberRoute" extra="BadJson,BadBody"}

```json body
{
  "email": "member@example.com"
}
```

::::

:::

::route-meta{def="CreateMemberRoute"}

This route adds an informational team member email row under the authenticated team account. Teams can have up to `maxMembers` member rows.

It is available in V1. When `userMembers` is disabled, the route returns `<response>404 badEndpoint</response>`.

::request-body{def="CreateMemberRoute" title="Request body"}

::response-body{def="CreateMemberRoute" response="goodMemberCreate" title="Response fields"}
