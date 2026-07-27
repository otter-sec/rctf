---
title: "`<route>GET</route>` List external-auth clients"
description: "`<route>GET /api/v2/admin/external-auth/clients</route>`"
order: 29
---

:::aside

::route-example{def="ListExternalAuthClientsRouteV2"}

:::

::route-meta{def="ListExternalAuthClientsRouteV2"}

Returns every registered external-auth client. Client secrets are never returned by this route - they are shown exactly once at creation time by [Create external-auth client](/api/admin/external-auth-create/) and cannot be retrieved afterward.

See [External auth](/api/external-auth/) for the user-facing routes and [External apps](/admin/external-auth/) for the operator setup.

::response-body{def="ListExternalAuthClientsRouteV2" response="goodAdminExternalAuthClients" title="Response fields"}
