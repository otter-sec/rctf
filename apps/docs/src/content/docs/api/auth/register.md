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

::route-meta{def="RegisterRouteV2" rateLimit="Registration buckets. Burst `20`, refill window `600000` ms per IP on every registration path, plus burst `2`, refill window `3600000` ms per email when a verification email would be sent, plus burst `2`, refill window `3600000` ms per team name when a password is supplied."}

Creates a team account. Most deployments ask the team to prove ownership of an email address before the account becomes usable, so a successful request often sends a verification email instead of returning tokens immediately.

For new clients, prefer the V2 route. The V1 route remains available for clients that already use the original registration fields.

The rate limits apply even when captcha is enabled. The per-IP bucket is consumed by every registration path, including CTFtime and password registrations. The per-email bucket is consumed only when rCTF would send a verification email, and the per-name bucket only when a password is supplied. Exceeding any of them returns `<response>429 badRateLimit</response>` with the wait in `data.timeLeft`.

::::tabs{sync="register-version"}

:::tab[V2]

`<route>POST /api/v2/auth/register</route>` uses `captchaCode` for captcha protected registration. If the team can be created immediately, the response includes both an auth token for user routes and a team token for recovery or team scoped auth flows.

V2 also accepts an optional `password`. The body must carry at least one of `email`, `ctftimeToken`, or `password`, so a password lets a team register without an email address at all.

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

## Registering with a password

`password` is a V2 field. Supplying it changes two things about the flow.

The account is created immediately and no verification email is sent, even on a deployment with an email provider configured. The route returns `<response>200 goodRegisterV2</response>` and the team can log in through [log in](/api/auth/login/) right away. An `email` sent alongside a password is stored on the account without being verified.

The account always starts in the default division, whatever the email address says. That is `<red>defaultDivision</red>` when [configured](/configuration), and otherwise the first configured division. Division ACLs match on the email address, and on a password registration that address has not been proven, so letting it pick a division would hand out restricted divisions to anyone willing to type a sponsor's domain. Moving to another division still goes through [set email auth](/api/users/email/), which verifies the address first.

A password must be 8 to 128 characters. It is not trimmed or normalized, and there are no composition rules. A password outside that range returns `<response>400 badPassword</response>`.
