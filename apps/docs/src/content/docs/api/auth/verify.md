---
title: "<route>POST</route> Verify a token"
description: "<route>POST /api/[v2,v1]/auth/verify</route>"
order: 2
---

:::aside

::::tabs{sync="verify-version"}

:::tab[V2]

::route-example{def="VerifyRouteV2" extra="BadJson,BadBody"}

:::

:::tab[V1]

::route-example{def="VerifyRoute" extra="BadJson,BadBody"}

:::

::::

:::

::route-meta{def="VerifyRouteV2"}

Checks a verification style token and applies the related account change. The same endpoint handles pending registrations, account recovery with a team token, and email change confirmations.

For new clients, prefer the V2 route. It returns more registration data when a pending registration is completed.

::request-body{def="VerifyRouteV2" title="Request body"}

::::tabs{sync="verify-version"}

:::tab[V2]

`<route>POST /api/v2/auth/verify</route>` can complete a pending registration, return an auth token from a team token, or confirm an email change.

#### Response

| Token kind | Success kind | Effect |
| --- | --- | --- |
| Pending registration | `<response>200 goodRegisterV2</response>` | Creates the team, returns both tokens, and marks the verification row as used. |
| Team | `<response>200 goodVerify</response>` | Returns a fresh `authToken`. |
| Verify | `<response>200 goodEmailSet</response>` | Updates the team email after checking division ACLs again. |

For pending registrations, the response body matches the immediate success response from [register a team](/docs/api/auth/register/). Team tokens are recovery or login credentials, so the response returns a fresh `authToken`. Email change tokens do not return data after the email is updated.

::response-body{def="VerifyRouteV2" response="goodRegisterV2" title="Response fields"}

::response-body{def="VerifyRouteV2" response="goodVerify" title="Response fields"}

:::

:::tab[V1]

`<route>POST /api/v1/auth/verify</route>` can complete a pending registration, return an auth token from a team token, or confirm an email change.

#### Response

| Token kind | Success kind | Effect |
| --- | --- | --- |
| Pending registration | `<response>200 goodRegister</response>` | Creates the team, returns `authToken`, and marks the verification row as used. |
| Team | `<response>200 goodVerify</response>` | Returns a fresh `authToken`. |
| Verify | `<response>200 goodEmailSet</response>` | Updates the team email after checking division ACLs again. |

Pending registration and team token flows both return a fresh auth token. Email change tokens do not return data after the email is updated.

::response-body{def="VerifyRoute" response="goodRegister" title="Response fields"}

:::

::::

Verification can fail even when the token decrypts correctly. Verify tokens can be used once and expire after `loginTimeout`. Email change tokens also check division ACLs and duplicate email constraints when the request is submitted.
