---
title: "<route>GET</route> List external-auth clients"
description: "<route>GET /api/v2/admin/external-auth/clients</route>"
order: 28
---

:::aside

::route-example{def="ListExternalAuthClientsRouteV2"}

:::

::route-meta{def="ListExternalAuthClientsRouteV2"}

Returns every registered external-auth client. Client secrets are never returned by this route - they are shown exactly once at creation time by [Create external-auth client](/docs/api/admin/external-auth-create/) and cannot be retrieved afterward.

The end-user side of the external-auth flow lives at [External auth](/docs/api/external-auth/), and the operator walkthrough lives at [External apps](/docs/admin/external-auth/).

::response-body{def="ListExternalAuthClientsRouteV2" response="goodAdminExternalAuthClients" title="Response fields"}
