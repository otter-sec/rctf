---
title: "POST Resend verification"
description: "POST /api/v2/admin/user-verifications/:id/resend"
order: 16
---

:::aside

::::route-example{def="ResendAdminUserVerificationRouteV2"}

```json params
{
  "id": "verification-id"
}
```

::::

:::

::route-meta{def="ResendAdminUserVerificationRouteV2"}

This route sends another verification email for an outstanding pending verification row.

If email delivery is not configured, the route returns `<response>404 badEndpoint</response>` because there is no provider available to send the message.

::request-body{def="ResendAdminUserVerificationRouteV2" source="params" title="Path parameters"}

::response-body{def="ResendAdminUserVerificationRouteV2" response="goodAdminUserVerificationResendV2" title="Response fields"}
