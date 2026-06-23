---
title: "<route>GET</route> Admin bot queue depth"
description: "<route>GET /api/v2/admin/admin-bot/queue-depth</route>"
order: 27
---

:::aside

::route-example{def="GetAdminBotQueueDepthRouteV2"}

:::

::route-meta{def="GetAdminBotQueueDepthRouteV2"}

The admin bot worker can call this service route to check how many jobs are waiting in the queue.

The request is authenticated with the shared admin bot bearer token from `adminBot.provider.options.secretKey{:yaml}` in `rctf.d/{:dir}`.

::response-body{def="GetAdminBotQueueDepthRouteV2" response="goodAdminBotQueueDepth" title="Response fields"}
