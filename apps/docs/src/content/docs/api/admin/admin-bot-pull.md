---
title: "`<route>POST</route>` Pull admin bot job"
description: "`<route>POST /api/v2/admin/admin-bot/jobs/pull</route>`"
order: 24
---

:::aside

::route-example{def="PullAdminBotJobRouteV2"}

:::

::route-meta{def="PullAdminBotJobRouteV2"}

The admin bot worker calls this service route when it is ready for more work. It receives the oldest queued job. When nothing is waiting, the response has `job` set to `null{:ts}`.

The request is authenticated with the shared admin bot bearer token from `adminBot.provider.options.secretKey{:yaml}` in `rctf.d/{:dir}`.

::response-body{def="PullAdminBotJobRouteV2" response="goodAdminBotJobPull" title="Response fields"}
