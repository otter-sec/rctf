---
title: "`<route>GET</route>` Flag providers"
description: "`<route>GET /api/v2/admin/flags/providers</route>`"
order: 22
---

:::aside

::route-example{def="GetFlagProvidersRouteV2"}

:::

::route-meta{def="GetFlagProvidersRouteV2"}

This route lists the available flag validation providers along with a JSON schema for each provider's flag entry `config{:ts}`. The challenge editor uses this response to build and validate the `flags{:ts}` entries before saving a challenge.

Entries that omit `provider{:ts}` use `defaultProvider{:ts}`.

::response-body{def="GetFlagProvidersRouteV2" response="goodFlagProviders" title="Response fields"}
