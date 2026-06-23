---
title: "<route>POST</route> Submit a flag"
description: "<route>POST /api/v1/challs/:id/submit</route>"
order: 3
---

:::aside

::::route-example{def="SubmitFlagRoute" extra="BadJson,BadBody"}

```json body
{
  "flag": "flag{example}"
}
```

::::

:::

::route-meta{def="SubmitFlagRoute" rateLimit="Burst `5`, refill window `25000` ms, scoped to user and challenge."}

Submits a flag for the authenticated team. This route uses V1 because there is no V2 equivalent.

Rate limit conventions are documented under [`<route>/api#rate-limits</route>`](/api/#rate-limits).

::request-body{def="SubmitFlagRoute" source="params" title="Path parameters"}

::request-body{def="SubmitFlagRoute" title="Request body"}

A correct flag returns `<response>200 goodFlag</response>` (no data) and records a solve for the team. The route records a submission audit row for both correct and incorrect attempts. Admins can read those rows through [`<route>/api/v2/admin/submissions</route>`](/api/admin/).
