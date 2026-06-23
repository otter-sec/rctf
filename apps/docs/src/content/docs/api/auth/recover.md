---
title: "<route>POST</route> Recover an account"
description: "<route>POST /api/[v2,v1]/auth/recover</route>"
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

The response does not reveal whether the email belongs to an account. Unknown emails still get the same `<response>200 goodVerifySent</response>` envelope, which keeps the recovery endpoint from becoming an account lookup tool.

Recovery is rate limited independently of captcha so the endpoint cannot be used to flood an inbox with recovery emails. Each client IP has a burst of `5` requests with a refill window of `1500000` ms, and each target email has a burst of `2` requests with a refill window of `3600000` ms. Requests over either budget return `<response>429 badRateLimit</response>` with the remaining wait in `data.timeLeft`. Both buckets are consumed before the account lookup, so known and unknown emails are throttled identically.

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

If email delivery is not configured, recovery cannot be started because there is nowhere to send the token. Captcha, email validation, and rate limits are handled before any recovery email is queued.
