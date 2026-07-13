---
title: "`<route>GET</route>` Test an auth token"
description: "`<route>GET /api/v1/auth/test</route>`"
order: 6
---

:::aside

::route-example{def="TestAuthRoute"}

:::

::route-meta{def="TestAuthRoute"}

Checks whether the current auth token is still usable. This V1 route is still current because there is no V2 replacement for token validation.

A valid token returns `<response>200 goodToken</response>` with no data. Missing, malformed, expired, or otherwise invalid auth headers are rejected before any account data is returned.
