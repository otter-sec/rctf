---
title: "`<route>GET</route>` Instancer schema"
description: "`<route>GET /api/v2/admin/instancer/schema</route>`"
order: 21
---

:::aside

::route-example{def="GetInstancerSchemaRouteV2"}

:::

::route-meta{def="GetInstancerSchemaRouteV2"}

This route provides the active instancer provider JSON schema and defaults. The challenge editor uses this response to validate `instancerConfig{:ts}` before saving a challenge.

When no instancer provider is configured, the route returns `<response>404 badEndpoint</response>`.

::response-body{def="GetInstancerSchemaRouteV2" response="goodInstancerSchema" title="Response fields"}
