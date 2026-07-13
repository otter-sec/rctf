---
title: "`<route>PUT</route>` Set email auth"
description: "`<route>PUT /api/[v2,v1]/users/me/auth/email</route>`"
order: 5
---

:::aside

::::tabs{sync="users-email-version"}

:::tab[V2]

::::route-example{def="SetEmailRouteV2" extra="BadJson,BadBody"}

```json body
{
  "email": "team@example.com",
  "captchaCode": "optional-captcha-code"
}
```

::::

:::

:::tab[V1]

::::route-example{def="SetEmailRoute" extra="BadJson,BadBody"}

```json body
{
  "email": "team@example.com",
  "recaptchaCode": "optional-captcha-code"
}
```

::::

:::

::::

:::

::route-meta{def="SetEmailRouteV2"}

This route sets or changes the authenticated team's email. With an email provider configured, rCTF sends a verification message and returns `<response>200 goodVerifySent</response>`. Otherwise, it applies the change immediately and returns `<response>200 goodEmailSet</response>`.

The address must be unused and must still allow the team's current division under the division ACLs.

::::tabs{sync="users-email-version"}

:::tab[V2]

::request-body{def="SetEmailRouteV2" title="Request body"}

:::

:::tab[V1]

::request-body{def="SetEmailRoute" title="Request body"}

:::

::::

#### Response

Both success responses return no data. When the route returns `<response>200 goodVerifySent</response>`, the verification token can be submitted to [verify a token](/api/auth/verify/).
