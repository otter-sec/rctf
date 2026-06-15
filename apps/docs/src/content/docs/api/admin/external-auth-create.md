---
title: "POST Create external-auth client"
description: "POST /api/v2/admin/external-auth/clients"
order: 29
---

:::aside

::::route-example{def="CreateExternalAuthClientRouteV2" extra="BadJson,BadBody"}

```json body
{
  "name": "Dynamic scoring backend",
  "redirectUri": "https://my-service.example.com/auth/rctf/callback"
}
```

::::

:::

::route-meta{def="CreateExternalAuthClientRouteV2"}

Registers a new external-auth client. rCTF generates a UUID `<red>id</red>` and a 32-byte base64url `<red>secret</red>`. The redirect URI is stored exactly as supplied and is matched byte-for-byte at authorize time - no wildcards, no path normalization.

:::warning[The secret is shown exactly once]

The response is the only place where the client secret is ever returned. Store it immediately
  somewhere the integrator can retrieve it. If it gets lost the client must be deleted and
  re-created.

:::

::request-body{def="CreateExternalAuthClientRouteV2" title="Request body"}

::response-body{def="CreateExternalAuthClientRouteV2" response="goodAdminExternalAuthClientCreate" title="Response fields"}
