---
title: "`<route>POST</route>` Upload files"
description: "`<route>POST /api/[v2,v1]/admin/upload</route>`"
order: 6
---

:::aside

::::tabs{sync="admin-upload-version"}

:::tab[V2]

::::route-example{def="UploadFilesRouteV2" extra="BadBody"}

```json body
{
  "files": "@dist.zip"
}
```

::::

:::

:::tab[V1]

::::route-example{def="UploadFilesRoute" extra="BadJson,BadBody"}

```json body
{
  "files": [
    {
      "name": "dist.zip",
      "data": "data:application/zip;base64,..."
    }
  ]
}
```

::::

:::

::::

:::

::route-meta{def="UploadFilesRouteV2"}

This route uploads challenge files. Files are deduplicated by SHA 256, so uploading the same bytes again returns the existing URL.

V2 sends `multipart/form-data` with one or more `files` fields. V1 accepts JSON with base64 data URIs and remains available for older admin clients.

::::tabs{sync="admin-upload-version"}

:::tab[V2]

::request-body{def="UploadFilesRouteV2" title="Request body"}

:::

:::tab[V1]

::request-body{def="UploadFilesRoute" title="Request body"}

:::

::::

::::tabs{sync="admin-upload-version"}

:::tab[V2]

::response-body{def="UploadFilesRouteV2" response="goodFilesUploadV2" title="Response fields"}

:::

:::tab[V1]

::response-body{def="UploadFilesRoute" response="goodFilesUpload" title="Response fields"}

:::

::::

V1 upload responses do not include file `size`.
