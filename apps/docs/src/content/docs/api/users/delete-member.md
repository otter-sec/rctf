---
title: "`<route>DELETE</route>` Remove a team member"
description: "`<route>DELETE /api/v1/users/me/members/:id</route>`"
order: 11
---

:::aside

::::route-example{def="DeleteMemberRoute"}

```json params
{
  "id": "member-id"
}
```

::::

:::

::route-meta{def="DeleteMemberRoute"}

This route removes a team member email row from the authenticated team account. It is available in V1.

::request-body{def="DeleteMemberRoute" source="params" title="Path parameters"}

#### Response

A successful request returns `<response>200 goodMemberDelete</response>` with no data.
