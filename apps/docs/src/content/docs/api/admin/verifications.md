---
title: "GET Pending verifications"
description: "GET /api/v2/admin/user-verifications"
order: 14
---

:::aside

::route-example{def="GetAdminUserVerificationsRouteV2"}

:::

::route-meta{def="GetAdminUserVerificationsRouteV2"}

This route shows teams that registered with email verification but have not completed the verification step yet.

Pending verification rows include the team name, email, division, creation time, and expiration time. Admins can complete or resend these rows through the related endpoints.

::response-body{def="GetAdminUserVerificationsRouteV2" response="goodAdminUserVerificationsV2" title="Response fields"}
