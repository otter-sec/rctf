---
title: "`<route>POST</route>` Register a team"
description: "`<route>POST /api/[v2,v1]/auth/register</route>`"
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

The verification email limits apply even when captcha is enabled. They are consumed only when rCTF would send an email, so immediate registrations and CTFtime registrations do not count against them. Exceeding either limit returns `<response>429 badRateLimit</response>` with the wait in `data.timeLeft`.

::::tabs{sync="register-version"}

:::tab[V2]

`<route>POST /api/v2/auth/register</route>` uses `captchaCode` for captcha protected registration. If the team can be created immediately, the response includes both an auth token for user routes and a team token for recovery or team scoped auth flows.

::request-body{def="RegisterRouteV2" title="Request body"}

#### Response

If email verification is enabled, the route returns `<response>200 goodVerifySent</response>`. The team is not created yet. Submit the verification token to [verify a token](/api/auth/verify/) to finish registration.

If no verification step is needed, the route creates the team immediately and returns `<response>200 goodRegisterV2</response>` with both tokens.

::response-body{def="RegisterRouteV2" response="goodRegisterV2" title="Response fields"}

:::

:::tab[V1]

`<route>POST /api/v1/auth/register</route>` uses `recaptchaCode` for captcha protected registration. If the team can be created immediately, the response includes an auth token.

::request-body{def="RegisterRoute" title="Request body"}

#### Response

If email verification is enabled, the route returns `<response>200 goodVerifySent</response>`. The team is not created yet. Submit the verification token to [verify a token](/api/auth/verify/) to finish registration.

If no verification step is needed, the route creates the team immediately and returns `<response>200 goodRegister</response>` with an `authToken`.

::response-body{def="RegisterRoute" response="goodRegister" title="Response fields"}

:::

::::

For email registration, rCTF checks division ACLs before sending the verification message and chooses the default division allowed for that address. The client does not send a division. CTFtime registration bypasses email ACLs.
