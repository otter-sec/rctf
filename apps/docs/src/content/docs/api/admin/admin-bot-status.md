---
title: "<route>GET</route> Admin bot status"
description: "<route>GET /api/v2/admin/admin-bot/status</route>"
order: 22
---

:::aside

::route-example{def="GetAdminBotStatusRouteV2"}

:::

::route-meta{def="GetAdminBotStatusRouteV2"}

This route shows whether the admin bot provider is enabled and which source language the configured provider expects.

When no admin bot provider is configured, the route returns `<response>404 badEndpoint</response>`.

::response-body{def="GetAdminBotStatusRouteV2" response="goodAdminBotStatus" title="Response fields"}
