---
title: "`<route>PUT</route>` Update settings"
description: "`<route>PUT /api/v2/admin/settings</route>`"
order: 20
---

:::aside

::::route-example{def="UpdateAdminSettingsRouteV2" extra="BadJson,BadBody"}

```json body
{
  "data": {
    "ctfName": "Example CTF",
    "homeContent": "# Welcome",
    "startTime": 1770000000000,
    "endTime": 1770100000000,
    "sponsors": [
      {
        "name": "Example",
        "icon": "https://example.com/icon.png",
        "description": "Sponsor",
        "url": "https://example.com"
      }
    ],
    "meta": {
      "description": "Example CTF",
      "imageUrl": "https://example.com/card.png"
    },
    "faviconUrl": null,
    "logoLightUrl": null,
    "logoDarkUrl": null
  }
}
```

::::

:::

::route-meta{def="UpdateAdminSettingsRouteV2"}

This route updates runtime setting overrides. A nullable field set to `null{:ts}` clears that override and lets the configured default take effect again.

Changing `startTime` or `endTime` also queues a leaderboard recalculation so standings match the updated event window.

::request-body{def="UpdateAdminSettingsRouteV2" title="Request body"}

::response-body{def="UpdateAdminSettingsRouteV2" response="goodAdminSettingsUpdate" title="Response fields"}
