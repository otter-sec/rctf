---
title: "<route>GET</route> Preview a verification token"
description: "<route>GET /api/v2/auth/verify-info</route>"
order: 4
---

:::aside

::route-example{def="GetVerifyInfoRouteV2" extra="BadBody"}

:::

::route-meta{def="GetVerifyInfoRouteV2"}

Reads the public context for a verification token without marking it as used. This is useful before rendering a confirmation page, because the UI can show what the token is about before the user submits it.

This preview step is available in V2. V1 clients submit the token directly when the user confirms the action.

::request-body{def="GetVerifyInfoRouteV2" source="query" title="Query parameters"}

#### Response

A valid token returns `<response>200 goodVerifyInfo</response>` with enough detail to describe the pending action.

::response-body{def="GetVerifyInfoRouteV2" response="goodVerifyInfo" title="Response fields"}

Previewing does not mark the token as used. The same token still has to be submitted to [verify a token](/docs/api/auth/verify/) to complete the action.
