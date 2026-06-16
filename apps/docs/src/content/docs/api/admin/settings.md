---
title: "<route>GET</route> Read settings"
description: "<route>GET /api/v2/admin/settings</route>"
order: 19
---

:::aside

::route-example{def="GetAdminSettingsRouteV2"}

:::

::route-meta{def="GetAdminSettingsRouteV2"}

This route shows runtime setting overrides and config defaults side by side. Runtime overrides come from the database. Defaults come from config files and environment variables.

[Update settings](/docs/api/admin/settings-update/) can change or clear runtime overrides without restarting the server.

::response-body{def="GetAdminSettingsRouteV2" response="goodAdminSettings" title="Response fields"}
