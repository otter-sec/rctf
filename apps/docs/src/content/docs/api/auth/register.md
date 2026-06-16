---
title: "<route>POST</route> Register a team"
description: "<route>POST /api/[v2,v1]/auth/register</route>"
order: 1
---

:::aside

::::tabs{sync="register-version"}

:::tab[V2]

::::route-example{def="RegisterRouteV2" pick="name,email,captchaCode" extra="BadJson,BadBody"}

```json body
{
  "email": "team@example.com",
  "name": "otter-sec"
}
```

::::

:::

:::tab[V1]

::::route-example{def="RegisterRoute" pick="name,email,recaptchaCode" extra="BadJson,BadBody"}

```json body
{
  "email": "team@example.com",
  "name": "otter-sec"
}
```

::::

:::

::::

:::

::route-meta{def="RegisterRouteV2" rateLimit="Verification email buckets. Burst `20`, refill window `600000` ms per IP, plus burst `2`, refill window `3600000` ms per email. Only consumed when a verification email would be sent."}

Creates a team account. Most deployments ask the team to prove ownership of an email address before the account becomes usable, so a successful request often sends a verification email instead of returning tokens immediately.

For new clients, prefer the V2 route. The V1 route remains available for clients that already use the original registration fields.

Verification email delivery is rate limited independently of captcha. Each client IP has a burst of `20` requests with a refill window of `600000` ms, and each target email has a burst of `2` requests with a refill window of `3600000` ms. Requests over either budget return `<response>429 badRateLimit</response>` with the remaining wait in `data.timeLeft`. Registrations that complete without a verification email, such as CTFtime registrations or deployments without an email provider, do not consume these buckets.

::::tabs{sync="register-version"}

:::tab[V2]

`<route>POST /api/v2/auth/register</route>` uses `captchaCode` for captcha protected registration. If the team can be created immediately, the response includes both an auth token for user routes and a team token for recovery or team scoped auth flows.

::request-body{def="RegisterRouteV2" title="Request body"}

#### Response

If email verification is enabled, the route returns `<response>200 goodVerifySent</response>`. The team is not created yet. Submit the verification token to [verify a token](/docs/api/auth/verify/) to finish registration.

If no verification step is needed, the route creates the team immediately and returns `<response>200 goodRegisterV2</response>` with both tokens.

::response-body{def="RegisterRouteV2" response="goodRegisterV2" title="Response fields"}

:::

:::tab[V1]

`<route>POST /api/v1/auth/register</route>` uses `recaptchaCode` for captcha protected registration. If the team can be created immediately, the response includes an auth token.

::request-body{def="RegisterRoute" title="Request body"}

#### Response

If email verification is enabled, the route returns `<response>200 goodVerifySent</response>`. The team is not created yet. Submit the verification token to [verify a token](/docs/api/auth/verify/) to finish registration.

If no verification step is needed, the route creates the team immediately and returns `<response>200 goodRegister</response>` with an `authToken`.

::response-body{def="RegisterRoute" response="goodRegister" title="Response fields"}

:::

::::

Email registrations are checked against division ACLs before the verification email is sent. The server chooses the default allowed division for the email address, so the client does not send a division in this request. CTFtime registrations do not go through email ACLs.
