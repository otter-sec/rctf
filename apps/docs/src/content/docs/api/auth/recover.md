---
title: "`<route>POST</route>` Recover an account"
description: "`<route>POST /api/[v2,v1]/auth/recover</route>`"
order: 3
---

:::aside

::::tabs{sync="recover-version"}

:::tab[V2]

::route-example{def="RecoverRouteV2" extra="BadJson,BadBody"}

:::

:::tab[V1]

::route-example{def="RecoverRoute" extra="BadJson,BadBody"}

:::

::::

:::

::route-meta{def="RecoverRouteV2" rateLimit="Recovery email buckets. Burst `5`, refill window `1500000` ms per IP, plus burst `2`, refill window `3600000` ms per email."}

Starts account recovery for a team that still has access to its email inbox. When the request is accepted, the server sends a recovery email containing a team token.

The response does not reveal whether the email belongs to an account. Known and unknown addresses both return `<response>200 goodVerifySent</response>`.

The recovery limits apply even when captcha is enabled. rCTF checks them before looking up the account, so rate-limit behavior cannot reveal whether an address is registered. Exceeding either limit returns `<response>429 badRateLimit</response>` with the wait in `data.timeLeft`.

::::tabs{sync="recover-version"}

:::tab[V2]

`<route>POST /api/v2/auth/recover</route>` uses `captchaCode` for captcha protected recovery.

::request-body{def="RecoverRouteV2" title="Request body"}

#### Response

When email delivery is configured and the request passes validation, the route returns `<response>200 goodVerifySent</response>`. Submit the recovery token from the email to [verify a token](/api/auth/verify/) to mint a fresh auth token.

:::

:::tab[V1]

`<route>POST /api/v1/auth/recover</route>` uses `recaptchaCode` for captcha protected recovery.

::request-body{def="RecoverRoute" title="Request body"}

#### Response

When email delivery is configured and the request passes validation, the route returns `<response>200 goodVerifySent</response>`. The recovery token from the email can be exchanged for an auth token with [log in](/api/auth/login/) or submitted to [verify a token](/api/auth/verify/).

:::

::::

Recovery requires an email provider. rCTF validates the request, captcha, and rate limits before queuing the message.
