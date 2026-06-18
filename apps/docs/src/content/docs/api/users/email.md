---
title: "<route>PUT</route> Set email auth"
description: "<route>PUT /api/[v2,v1]/users/me/auth/email</route>"
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

This route sets or changes the email address for the authenticated team.

When email delivery is configured, the route sends a verification email and returns `<response>200 goodVerifySent</response>`. When email delivery is not configured, the email is updated immediately and the route returns `<response>200 goodEmailSet</response>`.

Duplicate emails are not accepted. Email changes also need to keep the team inside its division ACL.

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
