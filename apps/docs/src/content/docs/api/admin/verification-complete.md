---
title: "<route>POST</route> Complete verification"
description: "<route>POST /api/v2/admin/user-verifications/:id/complete</route>"
order: 15
---

:::aside

::::route-example{def="CompleteAdminUserVerificationRouteV2"}

```json params
{
  "id": "verification-id"
}
```

::::

:::

::route-meta{def="CompleteAdminUserVerificationRouteV2"}

This route lets an organizer complete a pending email verification manually and create the team. It is useful when the registration has already been verified outside the normal email flow.

Duplicate email and duplicate name checks still apply.

::request-body{def="CompleteAdminUserVerificationRouteV2" source="params" title="Path parameters"}

::response-body{def="CompleteAdminUserVerificationRouteV2" response="goodAdminUserVerificationCompleteV2" title="Response fields"}
