---
title: "`<route>GET</route>` Analytics script"
description: "`<route>GET /api/v2/integrations/analytics/script</route>`"
order: 2
---

:::aside

::curl-example{def="AnalyticsScriptRoute" baseUrl="https://rctf-new-dev.es3n1n.io"}

:::

::route-meta{def="AnalyticsScriptRoute"}

This route proxies the active analytics provider script when analytics are configured. It is intentionally not part of `@rctf/types`, because it returns JavaScript rather than an rCTF response body.

#### Response

The response body is the provider JavaScript. The API keeps the fetched script in memory for one hour.

When analytics are not configured, the route responds with `404`. Upstream fetch failures respond with `502`.
