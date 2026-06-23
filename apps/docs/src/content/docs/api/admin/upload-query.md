---
title: "<route>POST</route> Query uploads"
description: "<route>POST /api/[v2,v1]/admin/upload/query</route>"
order: 7
---

:::aside

::::tabs{sync="admin-upload-query-version"}

:::tab[V2]

::::route-example{def="QueryUploadsRouteV2" extra="BadJson,BadBody"}

```json body
{
  "uploads": [
    {
      "sha256": "<hex-digest>",
      "name": "dist.zip"
    }
  ]
}
```

::::

:::

:::tab[V1]

::::route-example{def="QueryUploadsRoute" extra="BadJson,BadBody"}

```json body
{
  "uploads": [
    {
      "sha256": "<hex-digest>",
      "name": "dist.zip"
    }
  ]
}
```

::::

:::

::::

:::

::route-meta{def="QueryUploadsRouteV2"}

This route lets the admin panel check whether files already exist by SHA 256 before uploading them. A `null{:ts}` URL means the file has not been uploaded yet.

For new clients, V2 is usually the best fit because it also returns nullable file size. V1 only returns the nullable URL.

::::tabs{sync="admin-upload-query-version"}

:::tab[V2]

::request-body{def="QueryUploadsRouteV2" title="Request body"}

:::

:::tab[V1]

::request-body{def="QueryUploadsRoute" title="Request body"}

:::

::::

::::tabs{sync="admin-upload-query-version"}

:::tab[V2]

::response-body{def="QueryUploadsRouteV2" response="goodUploadsQueryV2" title="Response fields"}

:::

:::tab[V1]

::response-body{def="QueryUploadsRoute" response="goodUploadsQuery" title="Response fields"}

:::

::::
